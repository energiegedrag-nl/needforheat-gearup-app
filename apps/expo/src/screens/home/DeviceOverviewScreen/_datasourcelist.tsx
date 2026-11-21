import { useQueryClient } from "@tanstack/react-query";
import { t } from "i18next";
import { useCallback, useContext, useEffect, useState } from "react";
import { FlatList, View } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";

import DeviceListItem from "./_listItem";
import ProgressBar from "./progressBar";

import RefreshStatus from "@/components/common/RefreshStatus";
import StatusIndicator from "@/components/common/StatusIndicator";
import useCloudFeeds from "@/hooks/cloud-feed/useCloudFeeds";
import useDevices from "@/hooks/device/useDevices";
import useEnergyQueries from "@/hooks/energyquery/useEnergyQueries";
import { UserContext } from "@/providers/UserProvider";
import { AllDataSourcesResponse, DataSourceListType } from "@/types/api";
import { processDataSource } from "@/utils/tools";

export default function DataSourceList({
  refresh,
  onRefresh,
  dataSourceList,
}: {
  refresh: boolean;
  dataSourceList: DataSourceListType;
  onRefresh: () => void;
}) {
  const queryClient = useQueryClient();
  const { isRefreshing: isRefreshingUser, refetch: refetchUser } = useContext(UserContext);
  const devices = useDevices();
  const { data, isLoading, refetch } = devices;
  const cloudFeeds = useCloudFeeds();
  const { data: cloudFeedData, isLoading: isLoadingCloudFeeds } = cloudFeeds;
  const energyQueries = useEnergyQueries();
  const { data: energyQueryData, isLoading: isLoadingEnergyQueries } = energyQueries;
  // Fetching new data while the old is on screen: shown by the pull-down indicator and the status line, also when
  // the app starts the refresh itself (on start, on return to the app, on returning to this screen).
  const isFetchingAny = devices.isFetching || cloudFeeds.isFetching || energyQueries.isFetching || isRefreshingUser;
  const updatedAt = Math.min(
    ...[devices.dataUpdatedAt, energyQueries.dataUpdatedAt].filter(time => time > 0).concat([Infinity])
  );
  const refreshFailed = devices.isError || energyQueries.isError || cloudFeeds.isError;

  const [itemData, setItemData] = useState<AllDataSourcesResponse[]>([]);
  const [allItemsDone, setAllItemsDone] = useState(true);
  const [progress, setProgress] = useState("0/0");
  const connectedState: number[] = [];

  const [scrollEnabled, setScrollEnabled] = useState(true);
  const onSwipeBegin = useCallback(() => setScrollEnabled(false), []);
  const onSwipeEnd = useCallback(() => setScrollEnabled(true), []);

  useEffect(() => {
    if (dataSourceList) {
      let connectedCount = 0;
      const newData: AllDataSourcesResponse[] = [];

      dataSourceList.items.forEach(dataSource => {
        const newResponse = processDataSource(dataSource, data, cloudFeedData, energyQueryData, dataSourceList);

        //Progressbar
        if (newResponse.connected === 2) {
          connectedState.push(dataSource.id);
          connectedCount++;
        }
        newData.push(newResponse);
      });

      newData.sort((a, b) => {
        const orderA = a.data_source?.order;
        const orderB = b.data_source?.order;

        // If either order is null, retain the original order
        if (!orderA || !orderB) {
          return 0;
        } else {
          return orderA - orderB;
        }
      });
      setItemData(newData);

      const progressString = `${connectedCount}/${dataSourceList.items.length}`;
      setProgress(progressString);
    } else {
      setProgress("0/0");
      setItemData(data ?? []);
    }
  }, [dataSourceList, data, cloudFeedData, energyQueryData]);

  useEffect(() => {
    if (refresh) {
      // Returning to this screen: refresh only what is stale (older than a minute).
      queryClient.refetchQueries({ stale: true, type: "active" });
      onRefresh();
    }
  }, [refresh, onRefresh, queryClient]);

  useEffect(() => {
    let itemDone = true;
    itemData.forEach(source => {
      if (source.connected !== 2) {
        itemDone = false;
      }
    });

    if (itemDone) {
      setAllItemsDone(true);
    } else {
      setAllItemsDone(false);
    }
  }, [itemData]);

  const refreshAfter20Seconds = () => {
    setTimeout(() => {
      refetch();
    }, 20000); // 10000 milliseconds = 10 seconds
  };

  // Only a full-screen spinner when there is nothing to show yet (first start without saved data).
  if (isLoading || isLoadingCloudFeeds || isLoadingEnergyQueries) {
    return <StatusIndicator isLoading />;
  }

  return (
    <View style={{ flex: 1 }}>
      <RefreshStatus
        fetching={isFetchingAny}
        updatedAt={Number.isFinite(updatedAt) ? updatedAt : 0}
        failed={refreshFailed}
      />
      <ProgressBar progress={progress} />
      <FlatList<AllDataSourcesResponse>
        data={itemData || data}
        contentContainerStyle={{ flexGrow: 1 }}
        style={{ width: "100%" }}
        keyExtractor={item => item.name}
        renderItem={({ item }) => (
          <DeviceListItem
            {...{
              item,
              onSwipeBegin,
              onSwipeEnd,
              allItemsDone,
              refreshAfter20Seconds,
            }}
          />
        )}
        ListEmptyComponent={
          <StatusIndicator isError errorText={t("screens.device_overview.device_list.empty_collection")} />
        }
        refreshControl={<RefreshControl enabled onRefresh={refreshData} refreshing={isFetchingAny} />}
        scrollEnabled={scrollEnabled}
      />
    </View>
  );

  function refreshData() {
    // Pulled down: everything on this screen, stale or not.
    refetchUser();
    refetch();
    energyQueries.refetch();
    cloudFeeds.refetch();
  }
}
