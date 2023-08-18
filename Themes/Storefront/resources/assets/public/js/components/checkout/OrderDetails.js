import store from '../../store';
import { trans } from "../../functions";


export default {
    template: `
    <aside class="order-summary-wrap">
    <div class="order-summary">
    <h2>Order Summary</h2>
        <div class="order-summary-top">
            <h3 class="section-title">{{ trans('storefront::cart.order_summary') }}</h3>
            <ul class="list-inline cart-item">
                <li v-for="cartItem in cartItems">
                    <label>
                        <a :href="productUrl(cartItem.product)" class="product-name" v-text="cartItem.product.name"></a>
                        <span class="product-quantity" v-text="'x' + cartItem.qty"></span>
                    </label>
                    <span class="price-amount" v-html="cartItem.unitPrice.inCurrentCurrency.formatted"></span>
                </li>
            </ul>
        </div>
        <p>Including shipping</p>
        <div class="order-summary-total">
        <h2>Total:</h2>
            <label>{{ trans('storefront::cart.total') }}</label>
            <span class="total-price" v-html="total.inCurrentCurrency.formatted"></span>
        </div>
    </div>
</aside>
    `,
    computed: {
        cartItems() {
            return store.state.cart.items; // Предполагаем, что в store.state.cart.items хранятся элементы корзины
        },
        total() {
            return store.state.cart.total; // Предполагаем, что в store.state.cart.total хранится общая сумма
        }
    },
    methods: {
        trans,
        productUrl(product) {
            return route("products.show", product.slug);
        }
    }
};
