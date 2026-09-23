// Use the server's current-time decision, including preparation time and pauses.
// Never substitute the customer's device clock for the checkout check.
export async function getOrderingStatus(client, branchId, signal) {
  if (!client || !branchId) throw new Error('Ordering status unavailable');
  const call = name => {
    const request = client.rpc(name, { p_branch: branchId });
    return signal ? request.abortSignal(signal) : request;
  };
  let { data, error } = await call('branch_ordering_status');
  if (error?.code === 'PGRST202') {
    // Older installations use the repository's original server-clock RPC.
    ({ data, error } = await call('get_branch_ordering_status'));
    if (error) throw error;
    if (typeof data?.open !== 'boolean') throw new Error('Invalid ordering status');
    return { open: data.open, reason: data.open ? 'open' : 'closed' };
  }
  if (error) throw error;
  if (typeof data?.accepting !== 'boolean') throw new Error('Invalid ordering status');
  return { open: data.accepting && data.orders_paused !== true, reason: data.orders_paused ? 'paused' : data.reason };
}
