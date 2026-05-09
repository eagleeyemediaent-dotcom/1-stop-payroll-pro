export default function manifest() {
  return {
    name: "1 Stop Payroll Pro",
    short_name: "Payroll Pro",
    description: "1 Stop Turnover Specialist Payroll App",
    start_url: "/",
    display: "standalone",
    background_color: "#02070a",
    theme_color: "#02070a",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
