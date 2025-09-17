-- Create API usage tracking table
CREATE TABLE public.api_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NULL,
  function_name TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_tokens INTEGER NOT NULL,
  completion_tokens INTEGER NOT NULL,
  total_tokens INTEGER NOT NULL,
  cost_usd NUMERIC(10,6) NOT NULL,
  receipt_id VARCHAR NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for API usage
CREATE POLICY "Users can view their own API usage" 
ON public.api_usage 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own API usage" 
ON public.api_usage 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Family members can view family API usage" 
ON public.api_usage 
FOR SELECT 
USING (family_id IS NOT NULL AND family_id = ANY (get_user_family_ids(auth.uid())));

-- Create indexes for better performance
CREATE INDEX idx_api_usage_user_id ON public.api_usage(user_id);
CREATE INDEX idx_api_usage_family_id ON public.api_usage(family_id);
CREATE INDEX idx_api_usage_created_at ON public.api_usage(created_at);
CREATE INDEX idx_api_usage_receipt_id ON public.api_usage(receipt_id);