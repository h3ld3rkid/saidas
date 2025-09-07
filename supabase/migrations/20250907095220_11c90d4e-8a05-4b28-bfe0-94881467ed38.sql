-- Add telegram_chat_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN telegram_chat_id TEXT;