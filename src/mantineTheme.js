import { createTheme } from "@mantine/core";

export const mantineTheme = createTheme({
  primaryColor: "sanrafael",
  fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontWeight: "800",
  },
  colors: {
    sanrafael: [
      "#edfdf8",
      "#d6f7ec",
      "#aeeedc",
      "#80dfc6",
      "#55ccb0",
      "#2fb89b",
      "#22927d",
      "#1d7566",
      "#185f55",
      "#10423c",
    ],
  },
  defaultRadius: "md",
  components: {
    Button: {
      defaultProps: {
        radius: "md",
      },
    },
    TextInput: {
      defaultProps: {
        radius: "md",
      },
    },
    Select: {
      defaultProps: {
        radius: "md",
      },
    },
    Modal: {
      defaultProps: {
        radius: "md",
        centered: true,
        overlayProps: { blur: 2 },
      },
    },
    Notification: {
      defaultProps: {
        radius: "md",
      },
    },
  },
});
