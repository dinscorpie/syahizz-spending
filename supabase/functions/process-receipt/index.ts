import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReceiptItem {
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  category: string;
  subcategory?: string;
}

interface ReceiptData {
  vendor_name: string;
  date: string;
  total_amount: number;
  items: ReceiptItem[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      throw new Error('No image data provided');
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client to get categories
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch categories from database
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('name, level')
      .order('level', { ascending: true })
      .order('name', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
    }

    const categoryList = categories?.map(cat => 
      cat.level === 1 ? cat.name : `${cat.name}`
    ).join(', ') || 'Food & Dining, Transportation, Shopping, Entertainment, Healthcare, Utilities, Housing, Personal Care, Education, Travel, Business, Other';

    console.log('Processing receipt with OpenAI...');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: `You are a receipt processing AI. Extract all relevant information from the receipt image and return it in JSON format. For each item, categorize it appropriately using the available categories. Return the data in this exact structure:
             {
               "vendor_name": "string",
               "date": "YYYY-MM-DD",
               "total_amount": number,
               "items": [
                 {
                   "name": "string",
                   "quantity": number,
                   "unit_price": number,
                   "total_price": number,
                   "category": "string"
                 }
               ]
             }
            
            Available categories: ${categoryList}
            
            CRITICAL REQUIREMENTS:
            - You MUST extract ALL items from the receipt. The items array CANNOT be empty.
            - Every receipt has at least one item - find and extract ALL items listed.
            - If tax is shown separately, include it as a separate item with category "Tax"
            - If service charge is shown separately, include it as a separate item with category "Service Charge"
            - You MUST assign a category to EVERY item. Choose the most appropriate category from the list above for each item. If an item doesn't fit any category well, use "Other". Never leave category field empty or null.
            - If you cannot clearly see individual items, extract what you can see or create reasonable line items based on the total amount.
            - The total_amount should be the final total including all taxes and charges
            - Be precise with amounts and dates. If information is unclear, make reasonable assumptions.
            
            IMPORTANT: Return ONLY the JSON object. Do not include any explanations, markdown, or code fences.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all information from this receipt:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
              }
            ]
          }
        ],
        max_completion_tokens: 1000
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('OpenAI response received');

    const content = result.choices?.[0]?.message?.content ?? '';
    console.log('OpenAI content preview:', String(content).slice(0, 200));

    function extractJson(text: string): any {
      try {
        return JSON.parse(text);
      } catch {
        const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        const candidate = fenceMatch ? fenceMatch[1] : text;
        try {
          return JSON.parse(candidate);
        } catch {
          const start = candidate.indexOf('{');
          if (start >= 0) {
            let depth = 0;
            for (let i = start; i < candidate.length; i++) {
              const ch = candidate[i];
              if (ch === '{') depth++;
              else if (ch === '}') {
                depth--;
                if (depth === 0) {
                  const jsonSlice = candidate.slice(start, i + 1);
                  try {
                    return JSON.parse(jsonSlice);
                  } catch {}
                }
              }
            }
          }
          throw new Error('Unable to parse JSON from model response');
        }
      }
    }

    const extractedData = extractJson(String(content));

    if (!extractedData || typeof extractedData !== 'object') {
      throw new Error('Model did not return a valid JSON object');
    }

    // Validate that items were extracted
    if (!extractedData.items || !Array.isArray(extractedData.items) || extractedData.items.length === 0) {
      throw new Error('No items were extracted from the receipt. Items are required.');
    }

    // Validate that each item has a category
    for (const item of extractedData.items) {
      if (!item.category || item.category.trim() === '') {
        throw new Error('All items must have a category assigned');
      }
    }

    console.log(`Successfully extracted ${extractedData.items.length} items from receipt`);

    return new Response(JSON.stringify(extractedData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing receipt:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Failed to process receipt' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});