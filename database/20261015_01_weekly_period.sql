-- Run this file ALONE and wait for Success before running 02.
-- PostgreSQL must commit the new enum value before it can be used.
alter type public.storet_pricing_period add value if not exists 'weekly' after 'daily';
