export const metadata = {
  metadataBase: new URL("https://chuhe-xiangqi-online.bowersbayley13783.chatgpt.site"),
  title: "楚河棋局｜線上象棋",
  description: "免註冊，打開網頁就能下的中國象棋。",
  openGraph: {
    title: "楚河棋局｜線上象棋",
    description: "與老友，再下一局。免註冊，打開網頁就能下的中國象棋。",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "楚河棋局線上象棋" }],
    locale: "zh_TW",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "楚河棋局｜線上象棋",
    description: "與老友，再下一局。免註冊，打開網頁就能下的中國象棋。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
