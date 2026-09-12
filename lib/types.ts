export type Plan='free'|'weekly'|'monthly'|'yearly';
export type BudgetMode='save'|'balanced'|'premium';
export type Product={id:string;title:string;store:'Amazon'|'Walmart'|'Temu'|'IKEA';price:number;image_url:string;product_url:string;affiliate_url:string;category:string;description:string;in_stock:boolean};
export type ProjectInput={name:string;room_type:string;style:string;color_palette:string;custom_colors?:string;budget:number;budget_mode:BudgetMode;keep_items:string;replace_items:string;notes:string;source_image_url:string};
