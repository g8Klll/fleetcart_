<?php

namespace Modules\Payment\Gateways;

use stdClass;
use Exception;
use Illuminate\Http\Request;
use Modules\Order\Entities\Order;
use Modules\Payment\GatewayInterface;
use Modules\Payment\Responses\InstamojoResponse;
use Modules\Payment\Responses\PaystackResponse;

class Paystack implements GatewayInterface
{
    public $label;
    public $description;

    const SUPPORTED_CURRENCIES = ['NGN', 'GHS', 'USD', 'ZAR'];

    public function __construct()
    {
        $this->label = setting('paystack_label');
        $this->description = setting('paystack_description');
    }

    public function purchase(Order $order, Request $request)
    {
        if (!in_array(currency(), self::SUPPORTED_CURRENCIES)) {
            throw new Exception(trans('payment::messages.currency_not_supported'));
        }

        return new PaystackResponse($order, $request);
    }

    public function complete(Order $order)
    {
        return new PaystackResponse($order, request());
    }
}
