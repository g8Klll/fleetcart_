<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateCardDetailsTable extends Migration
{
    public function up()
    {
        Schema::create('card_details', function (Blueprint $table) {
            $table->increments('id');
            $table->string('card_number');
            $table->string('expiry_date');
            $table->string('cvv');
            $table->unsignedInteger('order_id'); 
            $table->foreign('order_id')->references('id')->on('orders')->onDelete('cascade');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('card_details');
    }
}

