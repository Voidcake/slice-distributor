-- Some hosted projects enable a safe-update guard that rejects UPDATE
-- statements without an explicit WHERE clause. Queue resets intentionally
-- touch every order, so keep the all-row operation explicit.
create or replace function public.reset_reheat_queue(p_start_order_number text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_start_order_number !~ '^[0-9]+$' then
    raise exception 'Starting order number must contain digits only';
  end if;

  update public.orders
  set status = case
    when order_number::bigint < p_start_order_number::bigint then 'PROCESSED'
    else 'OPEN'
  end
  where true;
end;
$$;

revoke all on function public.reset_reheat_queue(text) from public;
grant execute on function public.reset_reheat_queue(text) to authenticated;
