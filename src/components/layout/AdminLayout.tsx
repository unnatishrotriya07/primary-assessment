import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={styles.container}>
      <Sidebar />
      <div style={styles.mainWrapper}>
        <Navbar />
        <main style={styles.content}>
          {children}
        </main>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    backgroundColor: "transparent",
  },
  mainWrapper: {
    flexGrow: 1,
    marginLeft: "220px",
    display: "flex",
    flexDirection: "column",
    minWidth: 0, // prevents flex item blowout
  },
  content: {
    flexGrow: 1,
    padding: "2rem",
  },
};
