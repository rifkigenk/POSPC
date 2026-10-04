<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->string('size', 30)->default('All Size')->after('name');
            $table->string('color', 60)->default('Default')->after('size');
            $table->decimal('cost_price', 18, 2)->nullable()->after('additional_price');
            $table->decimal('selling_price', 18, 2)->nullable()->after('cost_price');
            $table->decimal('min_stock', 15, 3)->default(0)->after('selling_price');
            $table->unique(['product_id', 'size', 'color'], 'product_size_color_unique');
        });

        Schema::table('sale_items', function (Blueprint $table) {
            $table->string('size', 30)->nullable()->after('sku');
            $table->string('color', 60)->nullable()->after('size');
        });

        Schema::create('suspended_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained()->nullOnDelete();
            $table->string('suspension_number', 50)->unique();
            $table->string('name');
            $table->text('notes')->nullable();
            $table->decimal('subtotal', 18, 2);
            $table->decimal('discount_amount', 18, 2)->default(0);
            $table->decimal('grand_total', 18, 2);
            $table->string('status', 20)->default('pending')->index();
            $table->timestamp('suspended_at')->index();
            $table->timestamps();
        });

        Schema::create('suspended_transaction_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('suspended_transaction_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
            $table->string('product_name');
            $table->string('sku', 60);
            $table->string('size', 30);
            $table->string('color', 60);
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 18, 2);
            $table->decimal('discount_amount', 18, 2)->default(0);
            $table->decimal('subtotal', 18, 2);
            $table->timestamps();
        });

        Schema::create('stock_opnames', function (Blueprint $table) {
            $table->id();
            $table->foreignId('outlet_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('opname_number', 50)->unique();
            $table->date('opname_date')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_opname_details', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_opname_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained()->restrictOnDelete();
            $table->foreignId('product_variant_id')->constrained()->restrictOnDelete();
            $table->decimal('system_stock', 15, 3);
            $table->decimal('physical_stock', 15, 3);
            $table->decimal('difference', 15, 3);
            $table->string('status', 20);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_opname_details');
        Schema::dropIfExists('stock_opnames');
        Schema::dropIfExists('suspended_transaction_details');
        Schema::dropIfExists('suspended_transactions');

        Schema::table('sale_items', function (Blueprint $table) {
            $table->dropColumn(['size', 'color']);
        });
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropUnique('product_size_color_unique');
            $table->dropColumn(['size', 'color', 'cost_price', 'selling_price', 'min_stock']);
        });
    }
};
