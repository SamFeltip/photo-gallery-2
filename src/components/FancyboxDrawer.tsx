import { useEffect, useState } from "react";
import { Drawer } from "vaul";

const OPEN_FANCYBOX_DRAWER_EVENT = "open-fancybox-drawer";

export function FancyboxDrawer() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const openDrawer = () => setOpen(true);
    const closeDrawer = () => setOpen(false);

    window.addEventListener(OPEN_FANCYBOX_DRAWER_EVENT, openDrawer);
    window.addEventListener("close-fancybox-drawer", closeDrawer);
    return () => {
      window.removeEventListener(OPEN_FANCYBOX_DRAWER_EVENT, openDrawer);
      window.removeEventListener("close-fancybox-drawer", closeDrawer);
    };
  }, []);

  return (
    <Drawer.Root open={open} onOpenChange={setOpen}>
      <Drawer.Portal>
        <Drawer.Overlay
          style={{
            background: "rgba(0, 0, 0, 0.55)",
            inset: 0,
            position: "fixed",
            zIndex: 10000,
          }}
        />
        <Drawer.Content
          style={{
            background: "white",
            borderRadius: "16px 16px 0 0",
            bottom: 0,
            left: 0,
            minHeight: "10rem",
            outline: "none",
            padding: "1rem 1.5rem 2rem",
            position: "fixed",
            right: 0,
            zIndex: 10001,
          }}
        >
          <div
            style={{
              background: "#d1d5db",
              borderRadius: "999px",
              height: "0.25rem",
              margin: "0 auto 1.5rem",
              width: "2.5rem",
            }}
          />
          <Drawer.Title style={{ margin: 0 }}>hello world</Drawer.Title>
          <Drawer.Description style={{ marginBottom: 0 }}>
            Test drawer content.
          </Drawer.Description>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
