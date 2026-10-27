// Display only: stored timestamps and authorization rules are unchanged.
export function formatJapanDate(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '日時を確認できません';
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo', year: 'numeric', month: 'long', day: 'numeric',
    weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date) + '（日本時間）';
}
