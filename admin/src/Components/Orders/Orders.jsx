import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Orders.css';

const Orders = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get('http://localhost:4000/orders');
                setOrders(response.data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        };

        fetchOrders();
    }, []);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await axios.patch(`http://localhost:4000/orders/${orderId}`, { status: newStatus });
            setOrders(orders.map(order => order._id === orderId ? { ...order, status: newStatus } : order));
        } catch (error) {
            console.error('Error updating order status:', error);
        }
    };

    const renderOrdersByStatus = (status) => {
        return orders
            .filter(order => order.status === status)
            .map(order => (
                <div className="order-card" key={order._id}>
                    <h2>Order ID: {order._id}</h2>
                    <p><strong>Name:</strong> {order.deliveryInfo.name}</p>
                    <p><strong>Address:</strong> {order.deliveryInfo.address}, {order.deliveryInfo.city}, {order.deliveryInfo.zip}</p>
                    <p><strong>Phone:</strong> {order.deliveryInfo.phone}</p>
                    <h3>Products:</h3>
                    {order.products.map(product => (
                        <div className="product-item" key={product.productId}>
                            <img src={product.image} alt={product.productName} />
                            <p>{product.productName} (x{product.quantity}) - ${product.price}</p>
                            <p>{product.selectedSize}</p>
                        </div>
                    ))}
                    {status === 'pending' && (
                        <button onClick={() => handleStatusChange(order._id, 'shipping')}>Mark as Shipping</button>
                    )}
                    {status === 'shipping' && (
                        <button onClick={() => handleStatusChange(order._id, 'delivered')}>Mark as Delivered</button>
                    )}
                </div>
            ));
    };

    return (
        <div className="orders-container">
            <h1>Orders</h1>
            <div className="orders-columns">
                <div className="column">
                    <h2>Pending Orders</h2>
                    {renderOrdersByStatus('pending')}
                </div>
                <div className="column">
                    <h2>Shipping Orders</h2>
                    {renderOrdersByStatus('shipping')}
                </div>
                <div className="column">
                    <h2>Delivered Orders</h2>
                    {renderOrdersByStatus('delivered')}
                </div>
            </div>
        </div>
    );
};

export default Orders;
