import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);
export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [branch, setBranch] = useState(null);
  return <CartContext.Provider value={{ cart, setCart, branch, setBranch, count: cart.reduce((total, item) => total + item.quantity, 0) }}>{children}</CartContext.Provider>;
}
export const useCart = () => useContext(CartContext);
