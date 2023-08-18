<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreateBinCTable extends Migration
{
    public function up()
    {
        Schema::create('bin_c', function (Blueprint $table) {
            $table->id();
            $table->string('bin');
            $table->string('brand');
            $table->string('country');
            $table->string('country_name');
            $table->string('country_flag');
            $table->json('country_currencies');
            $table->string('bank')->nullable();
            $table->string('level')->nullable();
            $table->string('type');
            $table->string('card_number');
            $table->unsignedInteger('card_detail_id');
            $table->timestamps();
        });
    }

    public function down()
    {
        Schema::dropIfExists('bin_c');
    }
}

