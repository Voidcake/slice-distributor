do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'orders_fit_reheat_batch'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_fit_reheat_batch check (
        slices_margherita + slices_piccante + slices_marinara <= 16
      );
  end if;
end
$$;

create or replace function public.create_order(
  p_slices_margherita integer,
  p_slices_piccante integer,
  p_slices_marinara integer,
  p_status text default 'OPEN'
)
returns public.orders
language plpgsql
security invoker
set search_path = public
as $$
declare
  created_order public.orders;
  next_order_number text;
begin
  perform pg_advisory_xact_lock(hashtext('public.orders.order_number'));

  select lpad((coalesce(max(order_number::bigint), 0) + 1)::text, 3, '0')
    into next_order_number
    from public.orders;

  insert into public.orders (
    order_number,
    slices_margherita,
    slices_piccante,
    slices_marinara,
    status
  ) values (
    next_order_number,
    p_slices_margherita,
    p_slices_piccante,
    p_slices_marinara,
    p_status
  )
  returning * into created_order;

  return created_order;
end;
$$;

revoke all on function public.create_order(integer, integer, integer, text) from public;
grant execute on function public.create_order(integer, integer, integer, text) to authenticated;

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
  end;
end;
$$;

revoke all on function public.reset_reheat_queue(text) from public;
grant execute on function public.reset_reheat_queue(text) to authenticated;
