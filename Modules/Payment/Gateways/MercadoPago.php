<?php

namespace Modules\Payment\Gateways;

use Exception;
use Illuminate\Http\Request;
use MercadoPago\SDK as MercadoPagoSDK;
use MercadoPago\Preference as MercadoPagoPreference;
use MercadoPago\Item as MercadoPagoItem;
use Modules\Order\Entities\Order;
use Modules\Payment\GatewayInterface;
use Modules\Payment\Responses\MercadoPagoResponse;
use Modules\Support\Money;

class MercadoPago implements GatewayInterface
{
    public $label;
    public $description;

    public const CURRENCIES = ['UYU', 'PEN', 'COP', 'MXN', 'CLP', 'BRL', 'ARS'];


    public function __construct()
    {
        $this->label = setting('mercadopago_label');
        $this->description = setting('mercadopago_description');

        $this->init();
    }


    public function init()
    {
        if (setting('mercadopago_enabled')) {
            MercadoPagoSDK::setAccessToken(setting('mercadopago_access_token'));
        }
    }


    public function purchase(Order $order, Request $request)
    {
        if (!in_array(currency(), $this->getSupportedCurrencies())) {
            throw new Exception(trans('payment::messages.currency_not_supported'));
        }

        try {
            $preference = new MercadoPagoPreference();
            $preference->items = $this->prepareItems($order);
            $preference->binary_mode = true;

            $preference->back_urls = [
                'success' => $this->getRedirectUrl($order),
                'failure' => $this->getPaymentFailedUrl($order),
            ];

            $preference->auto_return = 'approved';
            $preference->external_reference = 'ref' . time();

            $preference->save();
        } catch (Exception $e) {
            throw new Exception(trim(trim($e->getMessage()), '"'));
        } finally {
            if (!$preference->id) {
                throw new Exception(trans('payment::messages.payment_gateway_error'));
            }
        }

        return new MercadoPagoResponse($order, $preference);
    }


    private function getRedirectUrl($order)
    {
        return route('checkout.complete.store', ['orderId' => $order->id, 'paymentMethod' => 'mercadopago']);
    }


    private function getPaymentFailedUrl($order)
    {
        return route('checkout.payment_canceled.store', ['orderId' => $order->id, 'paymentMethod' => 'mercadopago']);
    }


    public function prepareItems($order): array
    {
        $items = $this->prepareProductItems($order->products);
        $taxItem = $this->prepareTaxItem($order);

        if (!empty($taxItem->unit_price)) {
            $items[] = $this->prepareTaxItem($order);
        }

        $discountItem = $this->prepareDiscountItem($order);

        if (!empty($discountItem->unit_price)) {
            $items[] = $this->prepareDiscountItem($order);
        }

        return $items;
    }


    public function prepareProductItems($orderProducts): array
    {
        $productItems = [];

        $orderProducts->each(function ($product) use (&$productItems) {
            $productItem = $this->prepareProductItem($product);
            if (!empty($productItem->unit_price)) {
                $productItems[] = $productItem;
            }
        });

        return $productItems;
    }


    public function prepareProductItem($orderProduct)
    {
        $item = new MercadoPagoItem();
        $item->title = $orderProduct->product->name;
        $item->quantity = $orderProduct->qty;
        $item->currency_id = currency();
        $item->unit_price = (float)$orderProduct->unit_price->convertToCurrentCurrency()->amount();

        return $item;
    }


    public function prepareTaxItem($order)
    {
        $item = new MercadoPagoItem();
        $item->title = trans('payment::order.tax');
        $item->quantity = 1;
        $item->currency_id = currency();
        $item->unit_price = (float)$order
            ->totalTax()
            ->convertToCurrentCurrency()
            ->amount();

        return $item;
    }


    public function prepareDiscountItem($order)
    {
        $item = new MercadoPagoItem();
        $item->title = trans('payment::order.discount');
        $item->quantity = 1;
        $item->currency_id = currency();

        $item->unit_price = (float)(-1 * $order->discount->convertToCurrentCurrency()->amount());

        return $item;
    }


    public function getSupportedCurrencies()
    {
        return [setting('mercadopago_supported_currency'), 'USD'];
    }


    public function complete(Order $order)
    {
        return new MercadoPagoResponse($order, request());
    }
}
