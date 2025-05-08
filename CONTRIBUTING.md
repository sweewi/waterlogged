# Contributing to Waterlogged

Thank you for your interest in contributing to the Waterlogged project! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please be respectful and constructive in all communications related to this project. We aim to foster an inclusive and welcoming community.

## Ways to Contribute

There are several ways you can contribute to Waterlogged:

- **Bug Reports**: Create detailed issues for bugs you encounter
- **Feature Requests**: Suggest new features or improvements
- **Documentation**: Help improve or expand our documentation
- **Code Contributions**: Implement new features or fix bugs
- **Testing**: Help test the system in different environments

## Development Workflow

### Setting Up Your Development Environment

1. Fork the repository
2. Clone your fork:
   ```
   git clone https://github.com/your-username/waterlogged.git
   cd waterlogged
   ```
3. Set up the upstream remote:
   ```
   git remote add upstream https://github.com/original-owner/waterlogged.git
   ```
4. Follow the setup instructions in SETUP_GUIDE.md

### Making Changes

1. Create a new branch for your changes:
   ```
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following the code style guidelines

3. Write or update tests for your changes

4. Ensure all tests pass

5. Update documentation as needed

### Committing Changes

1. Keep your commits focused and atomic

2. Write descriptive commit messages:
   ```
   [Component] Brief description of the change

   More detailed explanation if needed. Explain the motivation for the change
   and how it improves the project.
   ```

3. Push your changes to your fork:
   ```
   git push origin feature/your-feature-name
   ```

### Submitting Pull Requests

1. Create a pull request from your fork to the main repository

2. Describe your changes in detail:
   - What problem does this PR solve?
   - What changes were made?
   - How was this tested?
   - Are there any breaking changes?

3. Link to any relevant issues

4. Wait for review and address any feedback

## Code Style Guidelines

### Arduino Code

- Follow the Arduino Style Guide
- Use descriptive variable and function names
- Add comments explaining non-obvious code
- Keep functions short and focused on a single task
- Use constants for pin numbers and other configuration values

### Python Code (Raspberry Pi)

- Follow PEP 8 guidelines
- Use type hints for function parameters and return values
- Document functions and classes using docstrings
- Handle exceptions appropriately

### JavaScript/HTML/CSS (Web Application)

- Follow the Airbnb JavaScript Style Guide
- Use semantic HTML elements
- Write responsive CSS
- Use modern JavaScript features but maintain compatibility
- Use descriptive variable and function names

## Testing

- For Arduino code, test with the available test sketches
- For Python code, use pytest for unit tests
- For web application, test in multiple browsers and screen sizes

## Documentation

- Keep README files up to date
- Document API endpoints
- Include diagrams where helpful
- Document hardware connections and requirements

## Version Control Practices

- Keep the `main` branch stable and deployable
- Use feature branches for development
- Squash commits before merging if appropriate
- Write meaningful commit messages

## Questions?

If you have any questions about contributing, please open an issue in the repository or contact a maintainer directly.

Thank you for contributing to Waterlogged!
