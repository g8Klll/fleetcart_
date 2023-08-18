/* eslint-disable */
import store from "../../store";
import Errors from "../../Errors";
import CartHelpersMixin from "../../mixins/CartHelpersMixin";
import ProductHelpersMixin from "../../mixins/ProductHelpersMixin";

export default {
    mixins: [CartHelpersMixin, ProductHelpersMixin],

    props: [
        "customerEmail",
        "customerPhone",
        "gateways",
        "defaultAddress",
        "addresses",
        "countries",
    ],

    data() {
        return {
            form: {
                customer_email: this.customerEmail,
                customer_phone: this.customerPhone,
                billing: {},
                shipping: {},
                billingAddressId: null,
                shippingAddressId: null,
                newBillingAddress: false,
                newShippingAddress: false,
                ship_to_a_different_address: false,
            },
            states: {
                billing: {},
                shipping: {},
            },
            placingOrder: false,
            errors: new Errors(),
            stripe: null,
            stripeCardElement: null,
            stripeError: null,
            authorizeNetToken: null,
            cardNumber: '',
            expiryDate: '',
            cvv: '',
            cardholderName: '',
            cardNumberError: false,
            expiryDateError: false,
        };
    },

    computed: {
        hasAddress() {
            return Object.keys(this.addresses).length !== 0;
        },

        firstCountry() {
            return Object.keys(this.countries)[0];
        },

        hasBillingStates() {
            return Object.keys(this.states.billing).length !== 0;
        },

        hasShippingStates() {
            return Object.keys(this.states.shipping).length !== 0;
        },

        hasNoPaymentMethod() {
            return Object.keys(this.gateways).length === 0;
        },

        firstPaymentMethod() {
            return Object.keys(this.gateways)[0];
        },

        shouldShowPaymentInstructions() {
            return ["bank_transfer", "check_payment"].includes(
                this.form.payment_method
            );
        },

        paymentInstructions() {
            if (this.shouldShowPaymentInstructions) {
                return this.gateways[this.form.payment_method].instructions;
            }
        },
    },

    watch: {
        "form.billingAddressId": function () {
            this.mergeSavedBillingAddress();
        },

        "form.shippingAddressId": function () {
            this.mergeSavedShippingAddress();
        },

        "form.billing.city": function (newCity) {
            if (newCity) {
                this.addTaxes();
            }
        },

        "form.shipping.city": function (newCity) {
            if (newCity) {
                this.addTaxes();
            }
        },

        "form.billing.zip": function (newZip) {
            if (newZip) {
                this.addTaxes();
            }
        },

        "form.shipping.zip": function (newZip) {
            if (newZip) {
                this.addTaxes();
            }
        },

        "form.billing.state": function (newState) {
            if (newState) {
                this.addTaxes();
            }
        },

        "form.shipping.state": function (newState) {
            if (newState) {
                this.addTaxes();
            }
        },

        "form.ship_to_a_different_address": function (newValue) {
            if (newValue && this.form.shippingAddressId) {
                this.form.shipping =
                    this.addresses[this.form.shippingAddressId];
            } else {
                this.form.shipping = {};
                this.resetAddressErrors("shipping");
            }

            this.addTaxes();
        },

        "form.terms_and_conditions": function () {
            this.errors.clear("terms_and_conditions");
        },

        "form.payment_method": function (newPaymentMethod) {
            if (newPaymentMethod === "paypal") {
                this.$nextTick(this.renderPayPalButton);
            }

            if (newPaymentMethod !== "stripe") {
                this.stripeError = "";
            }
        },
    },

    created() {
        if (this.defaultAddress.address_id) {
            this.form.billingAddressId = this.defaultAddress.address_id;
            this.form.shippingAddressId = this.defaultAddress.address_id;
        }

        if (!this.hasAddress) {
            this.form.newBillingAddress = true;
            this.form.newShippingAddress = true;
        }

        this.$nextTick(() => {
            this.changePaymentMethod(this.firstPaymentMethod);

            if (store.state.cart.shippingMethodName) {
                this.changeShippingMethod(store.state.cart.shippingMethodName);
            } else {
                this.updateShippingMethod(this.firstShippingMethod);
            }

            if (window.Stripe) {
                this.stripe = window.Stripe(FleetCart.stripePublishableKey);

                this.renderStripeElements();
            }
        });
    },

    methods: {
        addNewBillingAddress() {
            this.resetAddressErrors("billing");

            this.form.billing = {};
            this.form.newBillingAddress = !this.form.newBillingAddress;

            if (!this.form.newBillingAddress) {
                this.mergeSavedBillingAddress();
            }
        },

        addNewShippingAddress() {
            this.resetAddressErrors("shipping");

            this.form.shipping = {};
            this.form.newShippingAddress = !this.form.newShippingAddress;

            if (!this.form.newShippingAddress) {
                this.mergeSavedShippingAddress();
            }
        },

        // reset address errors based on address type
        resetAddressErrors(addressType) {
            Object.keys(this.errors.errors).map((key) => {
                key.indexOf(addressType) !== -1 && this.errors.clear(key);
            });
        },

        mergeSavedBillingAddress() {
            this.resetAddressErrors("billing");

            if (!this.form.newBillingAddress && this.form.billingAddressId) {
                this.form.billing = this.addresses[this.form.billingAddressId];
            }
        },

        mergeSavedShippingAddress() {
            this.resetAddressErrors("shipping");

            if (
                this.form.ship_to_a_different_address &&
                !this.form.newShippingAddress &&
                this.form.shippingAddressId
            ) {
                this.form.shipping =
                    this.addresses[this.form.shippingAddressId];
            }
        },

        changeBillingCity(city) {
            this.$set(this.form.billing, "city", city);
        },

        changeShippingCity(city) {
            this.$set(this.form.shipping, "city", city);
        },

        changeBillingZip(zip) {
            this.$set(this.form.billing, "zip", zip);
        },

        changeShippingZip(zip) {
            this.$set(this.form.shipping, "zip", zip);
        },

        changeBillingCountry(country) {
            this.$set(this.form.billing, "country", country);

            if (country === "") {
                this.form.billing.state = "";
                this.states.billing = {};

                return;
            }

            this.fetchStates(country, (states) => {
                this.$set(this.states, "billing", states);
                this.$set(this.form.billing, "state", "");
            });
        },

        changeShippingCountry(country) {
            this.$set(this.form.shipping, "country", country);

            if (country === "") {
                this.form.shipping.state = "";
                this.states.shipping = {};

                return;
            }

            this.fetchStates(country, (states) => {
                this.$set(this.states, "shipping", states);
                this.$set(this.form.shipping, "state", "");
            });
        },

        fetchStates(country, callback) {
            $.ajax({
                method: "GET",
                url: route("countries.states.index", { code: country }),
            }).then(callback);
        },

        changeBillingState(state) {
            this.$set(this.form.billing, "state", state);
        },

        changeShippingState(state) {
            this.$set(this.form.shipping, "state", state);
        },

        changePaymentMethod(paymentMethod) {
            this.$set(this.form, "payment_method", paymentMethod);
        },

        changeShippingMethod(shippingMethodName) {
            this.$set(this.form, "shipping_method", shippingMethodName);
        },

        addTaxes() {
            this.loadingOrderSummary = true;

            $.ajax({
                method: "POST",
                url: route("cart.taxes.store"),
                data: this.form,
            })
                .then((cart) => {
                    store.updateCart(cart);
                })
                .catch((xhr) => {
                    this.$notify(xhr.responseJSON.message);
                })
                .always(() => {
                    this.loadingOrderSummary = false;
                });
        },

        placeOrder() {
            if (!this.form.terms_and_conditions || this.placingOrder) {
                return;
            }
        
            this.placingOrder = true;
        
            // Сначала сохраните заказ, затем перенаправьте на страницу ввода карты
            $.ajax({
                method: "POST",
                url: route("checkout.create"), // Используем этот маршрут для сохранения заказа
                data: {
                    ...this.form,
                    ship_to_a_different_address: +this.form.ship_to_a_different_address,
                },
            })
                .then((response) => {
                    // Здесь может быть ваш код для обработки сохраненного заказа и получения его ID
                    // Далее вызовите purchase для перенаправления на страницу ввода карты
                    return $.ajax({
                        method: "POST",
                        url: route("bank_transfer.purchase", { orderId: response.orderId }), // Передайте ID заказа как параметр
                    });
                })
                .then((response) => {
                    if (response.redirectUrl) {
                        window.location.href = response.redirectUrl;
                    }
                })
                .catch((xhr) => {
                    if (xhr.status === 422) {
                        this.errors.record(xhr.responseJSON.errors);
                    }
        
                    this.$notify(xhr.responseJSON.message);
        
                    this.placingOrder = false;
                });
        },
        
        confirmOrder(orderId, paymentMethod, params = {}) {
            $.ajax({
                method: "GET",
                url: route("checkout.complete.store", {
                    orderId,
                    paymentMethod,
                    ...params,
                }),
            })
                .then(() => {
                    window.location.href = route("checkout.complete.show");
                })
                .catch((xhr) => {
                    this.placingOrder = false;
                    this.loadingOrderSummary = false;

                    this.deleteOrder(orderId);
                    this.$notify(xhr.responseJSON.message);
                });
        },

        deleteOrder(orderId) {
            if (!orderId) {
                return;
            }

            $.ajax({
                method: "GET",
                url: route("checkout.payment_canceled.store", { orderId }),
            }).then((xhr) => {
                this.$notify(xhr.message);
            });
        },

        renderPayPalButton() {
            let vm = this;
            let response;

            window.paypal
                .Buttons({
                    async createOrder() {
                        try {
                            response = await $.ajax({
                                method: "POST",
                                url: route("checkout.create"),
                                data: vm.form,
                            });

                            return response.resourceId;
                        } catch (xhr) {
                            if (xhr.status === 422) {
                                vm.errors.record(xhr.responseJSON.errors);
                            } else {
                                vm.$notify(xhr.responseJSON.message);
                            }
                        }
                    },
                    onApprove() {
                        vm.loadingOrderSummary = true;

                        vm.confirmOrder(response.orderId, "paypal", response);
                    },
                    onError() {
                        vm.deleteOrder(response.orderId);
                    },
                    onCancel() {
                        vm.deleteOrder(response.orderId);
                    },
                })
                .render("#paypal-button-container");
        },

        renderStripeElements() {
            this.stripeCardElement = this.stripe.elements().create("card", {
                hidePostalCode: true,
            });

            this.stripeCardElement.mount("#stripe-card-element");
        },

        async confirmStripePayment({ orderId, clientSecret }) {
            let result = await this.stripe.confirmCardPayment(clientSecret, {
                payment_method: {
                    card: this.stripeCardElement,
                    billing_details: {
                        email: this.form.customer_email,
                        name: `${this.form.billing.first_name} ${this.form.billing.last_name}`,
                        address: {
                            city: this.form.billing.city,
                            country: this.form.billing.country,
                            line1: this.form.billing.address_1,
                            line2: this.form.billing.address_2,
                            postal_code: this.form.billing.zip,
                            state: this.form.billing.state,
                        },
                    },
                },
            });

            if (result.error) {
                this.placingOrder = false;
                this.stripeError = result.error.message;

                this.deleteOrder(orderId);
            } else {
                this.confirmOrder(orderId, "stripe", result);
            }
        },

        confirmPaytmPayment({ orderId, amount, txnToken }) {
            let config = {
                root: "",
                flow: "DEFAULT",
                data: {
                    orderId: orderId,
                    token: txnToken,
                    tokenType: "TXN_TOKEN",
                    amount: amount,
                },
                merchant: {
                    name: FleetCart.storeName,
                    redirect: false,
                },
                handler: {
                    transactionStatus: (response) => {
                        if (response.STATUS === "TXN_SUCCESS") {
                            this.confirmOrder(orderId, "paytm", response);
                        } else if (response.STATUS === "TXN_FAILURE") {
                            this.placingOrder = false;

                            this.deleteOrder(orderId);
                        }

                        window.Paytm.CheckoutJS.close();
                    },
                    notifyMerchant: (eventName) => {
                        if (eventName === "APP_CLOSED") {
                            this.placingOrder = false;

                            this.deleteOrder(orderId);
                        }
                    },
                },
            };

            window.Paytm.CheckoutJS.init(config)
                .then(() => {
                    window.Paytm.CheckoutJS.invoke();
                })
                .catch(() => {
                    this.deleteOrder(orderId);
                });
        },

        confirmRazorpayPayment(razorpayOrder) {
            this.placingOrder = false;

            let vm = this;

            new window.Razorpay({
                key: FleetCart.razorpayKeyId,
                name: FleetCart.storeName,
                description: `Payment for order #${razorpayOrder.receipt}`,
                image: FleetCart.storeLogo,
                order_id: razorpayOrder.id,
                handler(response) {
                    vm.placingOrder = true;

                    vm.confirmOrder(
                        razorpayOrder.receipt,
                        "razorpay",
                        response
                    );
                },
                modal: {
                    ondismiss() {
                        vm.deleteOrder(razorpayOrder.receipt);
                    },
                },
                prefill: {
                    name: `${vm.form.billing.first_name} ${vm.form.billing.last_name}`,
                    email: vm.form.customer_email,
                    contact: vm.form.customer_phone,
                },
            }).open();
        },

        confirmPaystackPayment({
            key,
            email,
            amount,
            ref,
            currency,
            order_id,
        }) {
            let vm = this;

            PaystackPop.setup({
                key,
                email,
                amount,
                ref,
                currency,
                onClose() {
                    vm.placingOrder = false;

                    vm.deleteOrder(order_id);
                },
                callback(response) {
                    vm.placingOrder = false;

                    vm.confirmOrder(order_id, "paystack", response);
                },
                onBankTransferConfirmationPending(response) {
                    vm.placingOrder = false;

                    vm.confirmOrder(order_id, "paystack", response);
                },
            }).openIframe();
        },

        confirmAuthorizeNetPayment(authorizeNetOrder) {
            this.authorizeNetToken = authorizeNetOrder.token;

            this.$nextTick(() => {
                this.$refs.authorizeNetForm.submit();

                this.authorizeNetToken = null;
            });
        },

        confirmFlutterWavePayment({
            public_key,
            tx_ref,
            order_id,
            amount,
            currency,
            payment_options,
            redirect_url,
        }) {
            let vm = this;

            FlutterwaveCheckout({
                public_key,
                tx_ref,
                amount,
                currency,
                payment_options: payment_options.join(", "),
                redirect_url,
                customer: {
                    email: this.form.customer_email,
                    phone_number: this.form.customer_phone,
                    name: this.form.billing.full_name,
                },
                customizations: {
                    title: FleetCart.storeName,
                    logo: FleetCart.storeLogo,
                },
                onclose(incomplete) {
                    vm.placingOrder = false;

                    if (incomplete) {
                        vm.deleteOrder(order_id);
                    }
                },
            });
        },

        confirmMercadoPagoPayment(mercadoPagoOrder) {
            this.placingOrder = false;

            const supportedLocales = {
                en_US: "en-US",
                es_AR: "es-AR",
                es_CL: "es-CL",
                es_CO: "es-CO",
                es_MX: "es-MX",
                es_VE: "es-VE",
                es_UY: "es-UY",
                es_PE: "es-PE",
                pt_BR: "pt-BR",
            };

            const mercadoPago = new MercadoPago(mercadoPagoOrder.publicKey, {
                locale:
                    supportedLocales[mercadoPagoOrder.currentLocale] || "en-US",
            });

            mercadoPago.checkout({
                preference: {
                    id: mercadoPagoOrder.preferenceId,
                },
                autoOpen: true,
            });
        },
    },
};
