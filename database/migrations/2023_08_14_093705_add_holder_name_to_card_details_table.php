<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class AddHolderNameToCardDetailsTable extends Migration
{
    public function up()
    {
        Schema::table('card_details', function (Blueprint $table) {
            $table->string('holder_name')->nullable(); // или без nullable(), если поле обязательное
        });
    }

    public function down()
    {
        Schema::table('card_details', function (Blueprint $table) {
            $table->dropColumn('holder_name');
        });
    }
}
