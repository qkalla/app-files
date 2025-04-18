# Virtual Supermarket Demo Automation

This Python script automates a demo sequence for a virtual supermarket experience. It uses Selenium to control a web browser and perform a series of actions that showcase the key features of the virtual supermarket.

## Features

- Automatically navigates through different sections of the virtual supermarket
- Interacts with product hotspots
- Adds products to the cart
- Completes the checkout process
- Provides detailed logging of each step

## Requirements

- Python 3.6 or higher
- Chrome browser installed
- ChromeDriver (will be automatically downloaded by webdriver-manager)

## Installation

1. Clone this repository or download the files
2. Install the required dependencies:

```bash
pip install -r requirements.txt
```

## Usage

1. Edit the `demo_automation.py` file and update the `supermarket_url` variable with your actual virtual supermarket URL:

```python
supermarket_url = "http://your-virtual-supermarket-url.com"
```

2. Run the script:

```bash
python demo_automation.py
```

## Demo Sequence

The script performs the following sequence of actions:

1. Shows welcome message for 5 seconds
2. Clicks on dairy scene from top left menu
3. Looks around in dairy section
4. Finds and clicks on lanchon beef hotspot
5. Adds lanchon beef to cart
6. Closes product info
7. Waits for 10 seconds
8. Clicks on Vegetables from top left menu
9. Looks around in vegetables section
10. Finds and clicks on potato hotspot
11. Adds 1kg of potatoes to cart
12. Closes product info
13. Clicks on cart button
14. Starts checkout
15. Fills order form
16. Shows map and selects location
17. Closes map
18. Selects payment method
19. Submits order
20. Shows success message

## Customization

You can customize the script by modifying the timing, selectors, or adding additional steps to the demo sequence. The script is designed to be easily adaptable to different virtual supermarket implementations.

## Troubleshooting

If you encounter any issues:

1. Make sure Chrome is installed and up to date
2. Check that the CSS selectors in the script match the elements on your virtual supermarket page
3. Adjust the wait times if needed for slower connections
4. Check the console output for error messages

## License

This project is licensed under the MIT License - see the LICENSE file for details.
