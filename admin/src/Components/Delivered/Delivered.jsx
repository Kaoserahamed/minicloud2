import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './Delivered.css';

const Delivered = () => {
    const [orders, setOrders] = useState([]);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const response = await axios.get('http://localhost:4000/orders?status=delivered');
                setOrders(response.data);
            } catch (error) {
                console.error('Error fetching orders:', error);
            }
        };

        fetchOrders();
    }, []);

    return (
        <div className="orders-container">
            <h1>Delivered Orders</h1>
            {orders.length === 0 ? (
                <p>No delivered orders.</p>
            ) : (
                orders.map(order => (
                    <div className="order-card" key={order._id}>
                        <h2>Order ID: {order._id}</h2>
                        <p><strong>Name:</strong>
                        {order.deliveryInfo.name}</p>
                        <p><strong>Address:</strong> {order.deliveryInfo.address}, {order.deliveryInfo.city}, {order.deliveryInfo.zip}</p>
                        <p><strong>Phone:</strong> {order.deliveryInfo.phone}</p>
                        <h3>Products:</h3>
                        {order.products.map(product => (
                            <div className="product-item" key={product.productId}>
                                <img src={product.image} alt={product.productName} />
                                <p>{product.productName} (x{product.quantity}) - ${product.price}</p>
                            </div>
                        ))}
                    </div>
                ))
            )}
        </div>
    );
};

export default Delivered;