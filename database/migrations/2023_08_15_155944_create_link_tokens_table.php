<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateLinkTokensTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('link_tokens', function (Blueprint $table) {
            $table->id(); // Первичный ключ
            $table->string('token', 64)->unique(); // Уникальный токен для ссылки
            $table->unsignedInteger('order_id');
            $table->boolean('is_active')->default(1); // Флаг активности ссылки: 1 - активно, 0 - неактивно
            $table->timestamps(); // created_at и updated_at временные метки

            // Внешний ключ, связывающий с таблицей заказов
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('link_tokens');
    }
}
