import { db } from './index';
import { users, categories, menuItems, orders, orderItems, transactions } from './schema';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

async function seed() {
    console.log('Seeding database...');

    try {
        // Clear existing data
        await db.delete(transactions);
        await db.delete(orderItems);
        await db.delete(orders);
        await db.delete(menuItems);
        await db.delete(categories);
        await db.delete(users);

        // Create Users
        const passwordHash = await bcrypt.hash('password123', 10);

        const adminUser = await db
            .insert(users)
            .values({
                email: 'admin@pos.com',
                password: passwordHash,
                fullName: 'Admin User',
                role: 'admin',
            })
            .returning();

        const cashierUser = await db
            .insert(users)
            .values({
                email: 'kasir@pos.com',
                password: passwordHash,
                fullName: 'Kasir User',
                role: 'kasir',
            })
            .returning();

        const chefUser = await db
            .insert(users)
            .values({
                email: 'chef@pos.com',
                password: passwordHash,
                fullName: 'Chef User',
                role: 'chef',
            })
            .returning();

        console.log('Users created');

        // Create Categories
        const categoriesData = [
            { name: 'Kopi', icon: 'coffee', description: 'Berbagai jenis kopi espresso dan manual brew' },
            { name: 'Non-Kopi', icon: 'local_bar', description: 'Minuman non-kopi seperti teh, jus, dan mocktail' },
            { name: 'Pastry', icon: 'bakery_dining', description: 'Roti, kue, dan pastry fresh dari oven' },
            { name: 'Makanan', icon: 'restaurant', description: 'Menu makanan berat dan snack' },
        ];

        const createdCategories = await db
            .insert(categories)
            .values(categoriesData)
            .returning();

        console.log('Categories created');

        // Create Menu Items
        const menuItemsData = [
            {
                name: 'Caffe Latte',
                description: 'Espresso dengan steamed milk yang creamy',
                price: 25000,
                image: 'https://images.unsplash.com/photo-1570968992193-6e584a049269?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Kopi')!.id,
            },
            {
                name: 'Cappuccino',
                description: 'Espresso dengan foam susu yang tebal',
                price: 28000,
                image: 'https://images.unsplash.com/photo-1572442388796-11668a67e53d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Kopi')!.id,
            },
            {
                name: 'Americano',
                description: 'Espresso dengan air panas',
                price: 20000,
                image: 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Kopi')!.id,
            },
            {
                name: 'Matcha Latte',
                description: 'Green tea matcha premium dengan susu',
                price: 30000,
                image: 'https://images.unsplash.com/photo-1515825838458-f2a94b20105a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Non-Kopi')!.id,
            },
            {
                name: 'Iced Lemon Tea',
                description: 'Teh segar dengan perasan lemon asli',
                price: 18000,
                image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Non-Kopi')!.id,
            },
            {
                name: 'Croissant Butter',
                description: 'Croissant classic dengan butter premium',
                price: 22000,
                image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Pastry')!.id,
            },
            {
                name: 'Pain au Chocolat',
                description: 'Croissant isi coklat belgia',
                price: 25000,
                image: 'https://images.unsplash.com/photo-1548149863-7eb9227f3118?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Pastry')!.id,
            },
            {
                name: 'Nasi Goreng Spesial',
                description: 'Nasi goreng dengan telur, ayam, dan kerupuk',
                price: 35000,
                image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Makanan')!.id,
            },
            {
                name: 'Spaghetti Carbonara',
                description: 'Pasta creamy dengan smoked beef dan parmesan',
                price: 45000,
                image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60',
                categoryId: createdCategories.find((c) => c.name === 'Makanan')!.id,
            },
        ];

        await db.insert(menuItems).values(menuItemsData.map(item => ({
            ...item,
            price: item.price.toString()
        })));

        console.log('Menu items created');

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

seed();
