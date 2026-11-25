'use client';
// 시험용: 테스터 교환 화면 (가짜 데이터, 버튼은 아직 동작 안 함)
import { TestView } from '@/components/test-view';
import { JOINED, MY_TEST, RECRUIT, TEST_POINTS } from '@/lib/demo';

export default function DemoTest() {
  return <TestView points={TEST_POINTS} recruit={RECRUIT} joined={JOINED} mine={MY_TEST} />;
}
