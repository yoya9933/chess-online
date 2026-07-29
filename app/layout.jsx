export const metadata = {
  title: "楚河棋局｜線上象棋",
  description: "免註冊，打開網頁就能下的中國象棋。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
