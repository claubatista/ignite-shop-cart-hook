import { createContext, ReactNode, useContext, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      let isProductInCart = false;
      let isProductInStock = true;
      const stockResponse = await api.get(`/stock/${productId}`);
      const updatedCart = cart.map((product) => {
        if (productId === product.id) {
          isProductInCart = true;
          const newAmount = product.amount + 1;
          if (stockResponse.data.amount < newAmount) {
            isProductInStock = false;
            toast.error("Quantidade solicitada fora de estoque");
          } else {
            product.amount = newAmount;
          }
        }
        return product;
      });
      if (!isProductInCart) {
        const response = await api.get(`/products/${productId}`);

        updatedCart.push({ ...response.data, amount: 1 });
      }
      if (isProductInStock) {
        setCart(updatedCart);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const newCart = cart.filter((product) => product.id !== productId);

      if (newCart.length === cart.length) {
        throw new Error();
      }

      setCart(newCart);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(newCart));
    } catch {
      toast.error("Erro na remoção do produto");
      return;
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }
      const stockResponse = await api.get(`/stock/${productId}`);

      if (amount > stockResponse.data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const updatedCart = cart.map((product) => {
        if (productId === product.id) {
          if (stockResponse.data.amount < amount) {
            toast.error("Quantidade solicitada fora de estoque");
          } else {
            product.amount = amount;
          }
        }
        return product;
      });
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));

      return setCart(updatedCart);
    } catch (err) {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
