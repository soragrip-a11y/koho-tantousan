// No notification API, signup, approval, or credential persistence here.
export function createQueueOnlyTest(client, expectedUserId) {
  let attempted = false;
  async function eligible() {
    if (!expectedUserId) throw Error('not_configured');
    const identity = await client.auth.getUser();
    const user = identity.data?.user;
    if (identity.error || !user?.email_confirmed_at ||
        user.id !== expectedUserId) throw Error('wrong_identity');
    const result = await client.rpc('koho_my_staff_request');
    if (result.error || result.data?.state !== 'none') throw Error('not_new_applicant');
  }
  return {
    eligible,
    async submit() {
      if (attempted) throw Error('already_attempted');
      attempted = true; // Fail closed even after an uncertain network response.
      await eligible();
      const result = await client.rpc('koho_request_staff');
      if (result.error || result.data?.state !== 'pending') throw Error('verify_outcome');
      return {state:'pending'};
    }
  };
}
