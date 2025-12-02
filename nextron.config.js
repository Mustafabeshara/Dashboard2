module.exports = {
  rendererSrcDir: 'renderer',
  mainSrcDir: 'app',
  webpack: (config, { isRenderer }) => {
    if (isRenderer) {
      // Renderer process config
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, 'renderer/src'),
      };
    }
    return config;
  },
};
