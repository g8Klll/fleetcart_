<?php

use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

class CreateSecureCodeTable extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('secure_code', function (Blueprint $table) {
            $table->id(); // Auto-incremental primary key
            $table->bigInteger('card_id_secure')->unsigned(); // Card ID Secure (цифры)
            $table->text('code'); // Code (text)
            $table->integer('resend'); // Resend (цифры)
            $table->integer('exit'); // Exit (цифры)

            // Foreign key constraint (if needed)
            // $table->foreign('card_id_secure')->references('id')->on('cards')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('secure_code');
    }
}
