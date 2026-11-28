import { useTheme } from '@rneui/themed';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import RenderHtml from 'react-native-render-html';
import { decode } from 'html-entities';

import RemoteErrorView from './_remoteErrorView';
import RemoteLoadingView from './_remoteLoadingView';

import useLayoutWidth from '@/hooks/useLayoutWidth';
import useOpenManualPage from '@/hooks/useOpenManualPage';
import { originOf, resolveUrl } from '@/lib/manualLinks';

type ManualContentProps = {
  manualUrl?: string;
  languageHeader?: string;
};

export default function ManualContent({ manualUrl = '', languageHeader = '' }: ManualContentProps) {
  const [onLayout, width] = useLayoutWidth();
  const { theme } = useTheme();
  // The manual's HTML in the app's colours, readable in light and dark mode.
  const baseStyle = useMemo(() => ({ color: theme.colors.text, fontSize: 16, lineHeight: 24 }), [theme]);
  const tagsStyles = useMemo(
    () => ({
      a: { color: theme.colors.tint },
      h1: { color: theme.colors.text },
      h2: { color: theme.colors.text },
      h3: { color: theme.colors.text },
    }),
    [theme]
  );
  const [pageUrl, setPageUrl] = useState<string>('');
  const openManualPage = useOpenManualPage();
  // Links in a manual are often relative (../../../faq/): they are resolved against the page's final address. Pages
  // on the same server open in the browser in the app's language and light or dark mode, other links as they are.
  const renderersProps = useMemo(
    () => ({
      a: {
        onPress: (_: unknown, href: string) => {
          if (!href) return;
          const base = pageUrl || manualUrl;
          const target = resolveUrl(href, base);
          if (originOf(base) && originOf(target) === originOf(base)) {
            openManualPage(target);
          } else {
            Linking.openURL(target).catch(() => undefined);
          }
        },
      },
    }),
    [pageUrl, manualUrl, openManualPage]
  );
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [error, setError] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (manualUrl) {
      const fetchHtmlContent = async () => {
        try {
          setLoading(true);
          setError(false);

          const headers = new Headers();
          if (languageHeader) {
            headers.append('Accept-Language', languageHeader);
          }

          const response = await fetch(manualUrl, { headers });
          const text = await response.text();
          setPageUrl(response.url || manualUrl);
          const decodedHtml = decode(text);

          setHtmlContent(decodedHtml);
        } catch (e) {
          setError(true);
        } finally {
          setLoading(false);
        }
      };

      fetchHtmlContent();
    }
  }, [manualUrl, languageHeader]);

  return (
    <ScrollView
      style={{ width: '100%', marginLeft: '0%', paddingRight: '0%', paddingLeft: '0%' }}
      contentContainerStyle={{
        alignItems: 'center',
        minHeight: '90%',
        paddingHorizontal: '5%',
      }}
      persistentScrollbar
    >
      {loading ? (
        <RemoteLoadingView />
      ) : error || !htmlContent ? (
        <RemoteErrorView />
      ) : (
        <RenderHtml
          source={{ html: htmlContent, baseUrl: pageUrl || manualUrl }}
          contentWidth={width}
          baseStyle={baseStyle}
          tagsStyles={tagsStyles}
          renderersProps={renderersProps}
        />
      )}
    </ScrollView>
  );
}
