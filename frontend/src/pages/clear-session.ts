export function GET({ session, redirect }) {
  session?.set('messages', [])
  return redirect('/')
}
