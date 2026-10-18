-- M2.1: a Small text size (15px root) for people who want more on screen.
alter table public.profiles drop constraint profiles_text_size_check;
alter table public.profiles add constraint profiles_text_size_check
  check (text_size in ('small', 'normal', 'large', 'xl'));
