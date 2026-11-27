module.exports = function (api) {
  api.cache(false);
  return {
    // Expo SDK 54 expects babel-preset-expo (its Metro serializer relies on it); with
    // @react-native/babel-preset the release bundle crashes at startup ("Property 'require'
    // doesn't exist"). The reanimated plugin is listed explicitly below, so the preset's own is off.
    presets: [["babel-preset-expo", { reanimated: false }]],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          path: "../../.env",
          verbose: false,
        },
      ],
      [
        "module-resolver",
        {
          // root: ["./src"],
          extensions: [".ios.js", ".android.js", ".js", ".ts", ".tsx", ".json"],
          alias: {
            "@": "./src",
          },
        },
      ],
      //[DO NOT UNCOMMENT!] WILL CRASH THE APP - TESTING NOT POSSIBLE ON REACT NATIVE
      //"@babel/plugin-proposal-class-properties",
      //"@babel/plugin-proposal-private-methods",
      "react-native-reanimated/plugin",
    ],
  };
};
