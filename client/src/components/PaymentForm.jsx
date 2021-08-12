import React, { useState } from "react";
import {
  CardElement,
  Elements,
  ElementsConsumer,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import OrderSummary from "./OrderSummary";
import { Button, HelperText } from "@windmill/react-ui";
import { useCart } from "context/CartContext";
import { formatCurrency } from "helpers/formatCurrency";
import PulseLoader from "react-spinners/PulseLoader";
import API from "api/axios.config";
import OrderService from "services/order.service";
import { useHistory } from "react-router";

const PaymentForm = ({ previousStep, addressData, nextStep }) => {
  const { cartSubtotal, cartTotal, cartData, setCartData } = useCart();
  const [error, setError] = useState()
  const [isProcessing, setIsProcessing] = useState(false);
  const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUB_KEY);
  const history = useHistory()

  const handleSubmit = async (e, elements, stripe) => {
    e.preventDefault();
    setError()
    const { fullname, email, address, city, state } = addressData;
    if (!stripe || !elements) {
      return;
    }
    try {
      setIsProcessing(true);
      const { data } = await API.post("/payment", {
        amount: (cartSubtotal * 100).toFixed(),
        email
      });

      const card = elements.getElement(CardElement);
      const result = await stripe.createPaymentMethod({
        type: "card",
        card,
        billing_details: {
          name: fullname,
          email,
          address: {
            city,
            line1: address,
            state,
            country: "NG", // TODO: change later
          },
        },
      });
      if(result.error){
        setError(result.error)
      }

      await stripe.confirmCardPayment(data.client_secret, {
        payment_method: result.paymentMethod.id,
      });

      OrderService.createOrder(cartSubtotal, cartTotal, data.id).then(res=>{
        setCartData({...cartData, items: []})
        setIsProcessing(false);
        history.push({
          pathname: "/cart/success",
          state: {
            fromPaymentPage: true,
          },
        });
      })
    } catch (error) {
      setIsProcessing(false);
      // throw error
    }
  };

  return (
    <div className="w-full md:w-1/2">
      <h1 className="text-3xl font-semibold text-center mb-2">Payment details</h1>
      <OrderSummary />
      <h1 className="font-medium text-2xl">Payment Method</h1>
      <Elements stripe={stripePromise}>
        <ElementsConsumer>
          {({ stripe, elements }) => (
            <form onSubmit={(e) => handleSubmit(e, elements, stripe)}>
              <CardElement className="border py-2" />
              {error && <HelperText valid={false}>{error.message}</HelperText>}
              <div className="flex justify-between py-4">
                <Button onClick={previousStep} layout="outline" size="small">
                  Back
                </Button>
                <Button
                  disabled={!stripe || isProcessing}
                  type="submit"
                  size="small"
                >
                  {isProcessing ? (
                    <PulseLoader size={10} color={"#0a138b"} />
                  ) : (
                    `Pay ${formatCurrency(cartSubtotal)}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </ElementsConsumer>
      </Elements>
    </div>
  );
};

export default PaymentForm;
