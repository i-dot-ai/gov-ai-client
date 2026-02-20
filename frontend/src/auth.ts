import 'dotenv/config';
import { decodeJwt } from 'jose';


export async function parseAuthToken(header: string) {
  if (!header) {
    console.error('No auth token provided to parse');
    return { email: null, roles: [] };
  }

  // Decode without verification since we're using auth-at-the-edge and can trust all traffic
  let tokenContent;
  try {
    tokenContent = decodeJwt(header);
  } catch(error) {
    console.error('Malformed JWT during decoding: ' + header, error);
    return { email: null, roles: [] };
  }

  const email = tokenContent.email as string | undefined;
  if (!email) {
    console.error('No email found in token');
    return null;
  }

  const realmAccess = tokenContent.realm_access as { roles?: string[] } | undefined;
  if (!realmAccess) {
    console.error('No realm access information found in token');
    return { email: null, roles: [] };
  }

  const roles = realmAccess.roles || [];
  // console.debug(`Roles found for user ${email}: ${roles}`);
  return {
    email,
    roles,
  };
}


/*
 *export async function getServerSideDecodedToken() {
 *  if (process.env.ENVIRONMENT === "local" || process.env.ENVIRONMENT === "test") {
 *    return null;
 *  }
 *
 *  const sessionHeaders = await headers();
 *  const token = sessionHeaders.get("x-amzn-oidc-accesstoken");
 *
 *  if (!token) {
 *    return null;
 *  }
 *
 *  const tokenContent = getDecodedJwt(token, true);
 *  return tokenContent || null;
 *}
 */
