export async function GET({ session, redirect }) {
  await session?.set('messages', []);
  return redirect('/');
}
