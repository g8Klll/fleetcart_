@extends('public.layout')

@section('title', 'Bank Transfer Payment')

@section('content')
    <div id="payment-form" class="container mt-4"> <!-- добавление отступа сверху -->
        <div class="row justify-content-center">
            <div class="col-md-6 col-sm-12 mb-4"> <!-- добавление отступа снизу для мобильных устройств -->
                <div class="w-100">
                    <order-details></order-details>
                </div>
            </div>
            <div class="col-md-6 col-sm-12">
                <div class="w-100">
                    <bank-transfer></bank-transfer>
                </div>
            </div>
        </div>
    </div>
@endsection
