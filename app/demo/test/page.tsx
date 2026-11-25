import { redirect } from 'next/navigation';
// 테스트 칸은 내 정보로 합쳐졌어요
export default function DemoTest() { redirect('/demo/me'); }
