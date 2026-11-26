// 앱줍줍: 테스트 끝난(완료·탈락) 지 14일 된 캡처 + 지운 앱의 캡처 사진 지우기. cron aj-test-sweep이 매시간 불러요 (verify_jwt: false).
// 지울 목록은 DB 함수 aj_test_take_old_caps(서비스 키만)가 넘겨주고 path를 비워요. hash는 남겨서 같은 사진 재사용을 계속 막아요. 누가 불러도 안전.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async () => {
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  let removed = 0;
  for (let round = 0; round < 5; round++) {
    const { data, error } = await db.rpc('aj_test_take_old_caps', { p_limit: 200 });
    if (error) return Response.json({ error: error.message, removed }, { status: 500 });
    const paths = (data || []) as string[];
    if (!paths.length) break;
    const r = await db.storage.from('aj-caps').remove(paths);
    if (r.error) return Response.json({ error: r.error.message, removed }, { status: 500 });
    removed += paths.length;
  }
  return Response.json({ removed });
});
