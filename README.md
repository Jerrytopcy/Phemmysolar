# PhemmySolar Nigeria - Solar Energy Website

A professional solar energy website with admin dashboard built with pure HTML, CSS, and JavaScript.

## Features

### Customer-Facing Website
- **Responsive Design**: Mobile-friendly layout that works on all devices
- **Hero Section**: Eye-catching banner with call-to-action buttons
- **Products Display**: Dynamic product grid loaded from localStorage
- **Services Section**: Showcase installation services with images
- **About Section**: Company information and features
- **Contact Form**: Functional contact form with validation
- **WhatsApp Integration**: Floating WhatsApp button for instant communication
- **Smooth Navigation**: Smooth scrolling and active link highlighting

### Admin Dashboard
- **Secure Login**: Simple authentication system (username: admin, password: admin123)
- **Product Management**: Add, edit, and delete products
- **Responsive Table**: View all products in an organized table
- **Settings Panel**: Manage company information
- **Session Management**: Secure logout functionality

## Project Structure

\`\`\`
phemmysolar/
├── index.html          → Customer-facing website
├── style.css           → Styles for customer site
├── script.js           → JavaScript for customer site
├── admin.html          → Admin login & dashboard
├── admin.css           → Styles for admin area
├── admin.js            → JavaScript for admin features
├── images/             → Product & banner images
│   ├── logo.png
│   ├── banner.jpg
│   ├── sample-product1.jpg
│   ├── sample-product2.jpg
│   ├── installation1.jpg
│   ├── installation2.jpg
│   ├── installation3.jpg
│   └── team.jpg
└── README.md           → Documentation
\`\`\`

## Getting Started

1. **Open the website**: Open `index.html` in your web browser
2. **Access admin panel**: Click "Admin" in the navigation or open `admin.html`
3. **Login credentials**: 
   - Username: `admin`
   - Password: `admin123`

## Data Storage

- Products are stored in browser's `localStorage`
- Admin authentication uses `sessionStorage`
- Data persists across page refreshes
- No backend server required

## Customization

### Update Contact Information
Edit the contact details in `index.html`:
- Phone number
- Email address
- WhatsApp number
- Physical address

### Change Colors
Modify CSS variables in `style.css` and `admin.css`:
\`\`\`css
:root {
    --primary-color: #f59e0b;
    --secondary-color: #0ea5e9;
    --dark-color: #1e293b;
}
\`\`\`

### Add Products
Use the admin dashboard to add products, or manually edit localStorage:
1. Open browser console
2. Run: `localStorage.getItem('solarProducts')`
3. Edit the JSON array
4. Run: `localStorage.setItem('solarProducts', JSON.stringify(products))`

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge
- Opera

## Future Enhancements

- Backend integration for data persistence
- Email functionality for contact form
- Shopping cart and checkout
- Order management system
- Image upload functionality
- User authentication with password hashing
- Payment gateway integration

## License

This project is open source and available for personal and commercial use.

## Support

For support or inquiries, contact: info@phemmysolar.ng
