import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "br.tec.medflow",
  appName: "MedFlow",
  webDir: "out",
  server: {
    url: "https://medflow.tec.br",
    cleartext: false,
  },
  ios: {
    scheme: "MedFlow",
    contentInset: "automatic",
  },
  plugins: {
    StatusBar: {
      style: "Light",
      backgroundColor: "#f8f5f0",
    },
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: "#f8f5f0",
      showSpinner: false,
      launchShowDuration: 1500,
    },
  },
};

export default config;
