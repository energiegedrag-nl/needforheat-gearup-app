import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Button, useTheme } from "@rneui/themed";
import * as SecureStore from "expo-secure-store";
import { evaluate } from "mathjs";
import { useEffect, useRef, useState } from "react";
import { getTimeZone } from "react-native-localize";

import { postEnergyQuery } from "@/api/energyquery";
import { StatusMessage } from "@/components/common/StatusMessage";
import Timeline from "@/components/common/Timeline";
import Box from "@/components/elements/Box";
import useAPIKey from "@/hooks/API/useAPIKey";
import useTranslation from "@/hooks/translation/useTranslation";
import { fetchDwelling, heatSignature } from "@/lib/heatSignature";
import { parseRoundingRules, roundForUpload } from "@/lib/privacy/rounding";
import { useDisableBackButton } from "@/hooks/useDisableBackButton";
import { EnergyQuery } from "@/types/api";
import { HomeStackParamList } from "@/types/navigation";
import { fetchTimeZone } from "@/utils/timezone";

type BuildingProfileProgressScreenProps = NativeStackScreenProps<HomeStackParamList, "BuildingProfileProgressScreen">;

export default function BuildingProfileProgressScreen({ navigation, route }: BuildingProfileProgressScreenProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { location, dataSource } = route.params;
  // EP-online key, handed out by the server at run time (optional; personal, so not stored).
  const {
    data: epOnlineKey,
    isFetched: epOnlineKeyFetched,
    isError: isEpOnlineKeyError,
  } = useAPIKey("EP-online");
  const [showButton, setShowButton] = useState<boolean>(false);
  //Timeline items
  const [isBAGReceived, setisBAGReceived] = useState<boolean>(false);
  const [isBAGReceivedError, setisBAGReceivedError] = useState<boolean>(false);

  const [is3DBAGReceived, setis3DBAGReceived] = useState<boolean>(false);
  const [is3DBAGReceivedError, setis3DBAGReceivedError] = useState<boolean>(false);

  const [isCalculating, setisCalculating] = useState<boolean>(false);
  const [isCalculatingError, setisCalculatingError] = useState<boolean>(false);

  const [isSucces, setisSucces] = useState<boolean>(false);
  const [isSuccesError, setisSuccesError] = useState<boolean>(false);
  //End timeline items

  const timelineData = [
    {
      title: t("screens.home_stack.energy_query.building_profile_progress.alert.initial_data.title"),
      description: t("screens.home_stack.energy_query.building_profile_progress.alert.initial_data.message"),
      finished: isBAGReceived,
      loading: !isBAGReceived,
      error: isBAGReceivedError,
    },
    {
      title: t("screens.home_stack.energy_query.building_profile_progress.alert.data.title"),
      description: t("screens.home_stack.energy_query.building_profile_progress.alert.data.message"),
      finished: is3DBAGReceived,
      loading: !is3DBAGReceived,
      error: is3DBAGReceivedError,
    },
    {
      title: t("screens.home_stack.energy_query.building_profile_progress.alert.calculating.title"),
      description: t("screens.home_stack.energy_query.building_profile_progress.alert.calculating.message"),
      finished: isCalculating,
      loading: !isCalculating,
      error: isCalculatingError,
    },
    {
      title: t("screens.home_stack.energy_query.building_profile_progress.alert.sending.title"),
      description: t("screens.home_stack.energy_query.building_profile_progress.alert.sending.message"),
      finished: isSucces,
      loading: !isSucces,
      error: isSuccesError,
    },
  ];
  const onLeave = () => navigation.navigate("HomeScreen");

  const MainFunction = async () => {
    // 1. BAG (PDOK, no key), 2. 3DBAG (no key) and, if the server hands out a key, EP-online.
    // Everything is fetched from the phone; the address is not sent to the NeedForHeat server.
    let dwelling: Awaited<ReturnType<typeof fetchDwelling>>;
    try {
      dwelling = await fetchDwelling(location, epOnlineKey?.api_key ?? null);
      setisBAGReceived(true);
      setis3DBAGReceived(true);
    } catch {
      setShowButton(true);
      setisBAGReceivedError(true);
      return;
    }

    // 3. Calculate: the heat performance signature (method of AnonyMate), plus any formulas the
    // campaign configured for this data source (on the 3DBAG attributes, as before).
    const currentLocaleTimeInUnix = Math.floor(Date.now() / 1000);
    const measurements: { value: string; property: { name: string }; time: number }[] = [];
    const add = (name: string, value: string | number) =>
      measurements.push({ value: String(value), property: { name }, time: currentLocaleTimeInUnix });
    try {
      // Everything computed here is rounded with the campaign's rules (or the defaults) before upload;
      // values without a rule are not uploaded. Not uploaded either: tau (= C / H, so it would narrow
      // the rounded values down) and the method used (it reveals whether a label exists).
      const rules = parseRoundingRules(dataSource.item.Rounding);
      const values: Record<string, number> = {};
      const signature = heatSignature(dwelling.input, "passend");
      if (signature) {
        values.heat_tr_building_cond__W_K_1 = signature.H__W_K_1;
        values.th_mass_building__Wh_K_1 = signature.C__Wh_K_1;
        values.aperture_sol__m2 = signature.Asol__m2;
        values.aperture_inf__cm2 = signature.Ainf__cm2;
      }

      const formulas = dataSource.item.Formula;
      if (formulas) {
        const a = dwelling.attributes as Record<string, any>;
        // Mapped values, explained in EnergyDoctor docs
        const variables = {
          a: a.b3_bag_bag_overlap,
          b: a.b3_bouwlagen,
          c: a.b3_h_dak_50p,
          d: a.b3_h_dak_70p,
          e: a.b3_h_dak_max,
          f: a.b3_h_dak_min,
          g: a.b3_h_maaiveld,
          h: a.b3_nodata_fractie_ahn3,
          i: a.b3_nodata_fractie_ahn4,
          j: a.b3_nodata_radius_ahn3,
          k: a.b3_nodata_radius_ahn4,
          l: a.b3_opp_buitenmuur,
          m: a.b3_opp_dak_plat,
          n: a.b3_opp_dak_schuin,
          o: a.b3_opp_grond,
          p: a.b3_opp_scheidingsmuur,
          q: a.b3_puntdichtheid_ahn3,
          r: a.b3_puntdichtheid_ahn4,
          s: a.b3_pw_datum,
          t: a.b3_rmse_lod12,
          u: a.b3_rmse_lod13,
          v: a.b3_rmse_lod22,
          w: a.b3_volume_lod12,
          x: a.b3_volume_lod13,
          y: a.b3_volume_lod22,
          z: a.oorspronkelijkbouwjaar,
          aa: a.voorkomenidentificatie,
        };
        for (const formula of formulas.split(",")) {
          const cleanFormula = formula.replace(/\[.*?\]/g, ""); // Remove content within square brackets
          const result = await evaluate(cleanFormula, variables);
          if (result === undefined || result === null) continue;
          const propertyMatch = formula.match(/\[(.*?)\]/); // Property name between square brackets
          const number = Number(result);
          if (propertyMatch && Number.isFinite(number)) values[propertyMatch[1]] = number;
        }
      }
      for (const [name, value] of Object.entries(roundForUpload(values, rules))) add(name, value);
      if (!measurements.length) throw new Error("nothing calculated");
      setisCalculating(true);
    } catch {
      setShowButton(true);
      setisCalculatingError(true);
      return;
    }

    // Add timezone measurement
    const timeZone = getTimeZone();
    await SecureStore.setItemAsync("timeZone", timeZone);
    fetchTimeZone(); //Update in RAM
    add("device_timezone__tmz", timeZone);

    // Creating energy query
    const energyQuery: EnergyQuery = {
      energy_query_type: {
        id: dataSource.item.ID,
      },
      uploads: [
        {
          measurements,
          instance_id: dataSource.item.ID,
          instance_type: "energy_query_type",
          device_time: currentLocaleTimeInUnix,
          size: measurements.length,
        },
      ],
    };

    try {
      await postEnergyQuery(energyQuery);
      setisSucces(true);
      setShowButton(true);
    } catch (error) {
      console.error("An error occurred posting Building profile query:", error);
      setisSuccesError(true);
      setShowButton(true);
    }
  };

  // Start once the server has answered whether there is an EP-online key (a missing key is fine).
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !(epOnlineKeyFetched || isEpOnlineKeyError)) return;
    started.current = true;
    MainFunction();
  }, [epOnlineKeyFetched, isEpOnlineKeyError]);

  // Disable going back to force the user to use the buttons
  useDisableBackButton(true);

  return (
    <Box padded style={{ flex: 1, justifyContent: "space-between" }}>
      <Box>
        <Timeline items={timelineData} />
      </Box>
      <Box padded>
        {isSucces ? (
          <StatusMessage
            label={t("screens.home_stack.energy_query.building_profile_progress.success.title")}
            message={t("screens.home_stack.energy_query.building_profile_progress.success.message")}
          />
        ) : null}

        {isBAGReceivedError ? (
          <StatusMessage
            label={t("screens.home_stack.energy_query.building_profile_progress.fail.title")}
            message={t("screens.home_stack.energy_query.building_profile_progress.fail.bag.message")}
          />
        ) : is3DBAGReceivedError ? (
          <StatusMessage
            label={t("screens.home_stack.energy_query.building_profile_progress.fail.title")}
            message={t("screens.home_stack.energy_query.building_profile_progress.fail.3dbag.message")}
          />
        ) : isCalculatingError ? (
          <StatusMessage
            label={t("screens.home_stack.energy_query.building_profile_progress.fail.title")}
            message={t("screens.home_stack.energy_query.building_profile_progress.fail.calculating.message")}
          />
        ) : isSuccesError ? (
          <StatusMessage
            label={t("screens.home_stack.energy_query.building_profile_progress.fail.title")}
            message={t("screens.home_stack.energy_query.building_profile_progress.fail.sending.message")}
          />
        ) : null}
      </Box>
      <Box style={{ flex: 1, width: "100%", alignItems: "center", justifyContent: "flex-end" }}>
        {showButton ? (
          <Button
            title={t("common.back_to_home") as string}
            containerStyle={{ width: "100%", marginTop: theme.spacing.md }}
            onPress={onLeave}
          />
        ) : null}
      </Box>
    </Box>
  );
}
