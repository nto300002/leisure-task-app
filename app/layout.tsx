import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ひとつ、やってみる | 余暇の小さな提案",
  description:
    "迷ったときに、いまの自分にできることをひとつ。遊びも、学びも、休むことも。",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
