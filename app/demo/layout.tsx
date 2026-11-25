// /demo 아래 전부: 시험 테마 표시용 표식 (globals.css 의 :root:has(.demo-mark))
export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return <><span className="demo-mark" hidden />{children}</>;
}
