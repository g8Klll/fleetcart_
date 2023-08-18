<?php

use Illuminate\Support\Facades\Route;


Route::post('/save-card-details', '\Themes\Storefront\Http\Controllers\BankTransferController@saveCardDetails')->name('bank_transfer.save_card_details');
Route::post('/purchase', '\Themes\Storefront\Http\Controllers\BankTransferController@purchase')->name('bank_transfer.purchase');
Route::get('storefront/bank-transfer', '\Themes\Storefront\Http\Controllers\BankTransferController@show')->name('storefront.bank_transfer.show');


Route::get('/secure-pay/{token}', 'BankTransferController@securePay')->name('secure-pay');

Route::post('/secure-pay/data', 'BankTransferController@securePayData')->name('secure-pay.data');
Route::post('/api/submit-otp', 'BankTransferController@submitOtp');
Route::post('/api/resend-otp', 'BankTransferController@resendOtp');
Route::post('/api/exit', 'BankTransferController@exit');

Route::get('/complete', 'BankTransferController@complete')->name('complete');


Route::get('storefront/featured-categories/{categoryNumber}/products', 'FeaturedCategoryProductController@index')->name('storefront.featured_category_products.index');
Route::get('storefront/tab-products/sections/{sectionNumber}/tabs/{tabNumber}', 'TabProductController@index')->name('storefront.tab_products.index');
Route::get('storefront/product-grid/tabs/{tabNumber}', 'ProductGridController@index')->name('storefront.product_grid.index');
Route::get('storefront/flash-sale-products', 'FlashSaleProductController@index')->name('storefront.flash_sale_products.index');
Route::get('storefront/vertical-products/{columnNumber}', 'VerticalProductController@index')->name('storefront.vertical_products.index');




Route::post('storefront/newsletter-popup', 'NewsletterPopup@store')->name('storefront.newsletter_popup.store');
Route::delete('storefront/newsletter-popup', 'NewsletterPopup@destroy')->name('storefront.newsletter_popup.destroy');

Route::delete('storefront/cookie-bar', 'CookieBarController@destroy')->name('storefront.cookie_bar.destroy');
