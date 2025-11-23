// src/app/models/AuthSite.js
const db = require("../../config/db")
const bcrypt = require("bcrypt")

class AuthSite {
    // ===== ĐĂNG KÝ USER MỚI =====
    static async register(registerData) {
        const connection = await db.getConnection()

        try {
            const {
                firstname,
                lastname,
                Gender,
                birthday,
                address,
                email,
                password,
                repassword,
            } = registerData

            // 1. Validate dữ liệu
            if (
                !firstname ||
                !lastname ||
                !Gender ||
                !birthday ||
                !address ||
                !email ||
                !password
            ) {
                throw new Error("All fields are required")
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(email)) {
                throw new Error("Invalid email format")
            }

            // Validate password match
            if (password !== repassword) {
                throw new Error("Passwords do not match")
            }

            // Validate password length
            if (password.length < 8) {
                throw new Error("Password must be at least 8 characters")
            }

            await connection.beginTransaction()

            // 2. Kiểm tra email đã tồn tại chưa
            const [existingUser] = await connection.query(
                "SELECT ID FROM Users WHERE Email = ?",
                [email]
            )

            if (existingUser.length > 0) {
                throw new Error("Email already exists")
            }

            // 3. Tạo username từ email
            let username = email.split("@")[0]

            // Kiểm tra và tạo username unique
            let [existingAccount] = await connection.query(
                "SELECT ID FROM Accounts WHERE UserName = ?",
                [username]
            )

            let counter = 1
            while (existingAccount.length > 0) {
                username = `${email.split("@")[0]}${counter}`
                ;[existingAccount] = await connection.query(
                    "SELECT ID FROM Accounts WHERE UserName = ?",
                    [username]
                )
                counter++
            }

            // 4. Hash password
            const saltRounds = 10
            const hashedPassword = await bcrypt.hash(password, saltRounds)

            // 5. Insert vào bảng Users
            const [userResult] = await connection.query(
                `INSERT INTO Users (FirstName, LastName, BirthDate, Gender, Email, Address, Statuses) 
                 VALUES (?, ?, ?, ?, ?, ?, 1)`,
                [firstname, lastname, birthday, Gender, email, address]
            )

            const userId = userResult.insertId

            // 6. Insert vào bảng Accounts
            const [accountResult] = await connection.query(
                `INSERT INTO Accounts (UserID, UserName, PasswordHash, Statuses) 
                 VALUES (?, ?, ?, 1)`,
                [userId, username, hashedPassword]
            )

            await connection.commit()

            // 7. Lấy thông tin user và account vừa tạo
            const user = await this.getUserById(userId)
            const account = await this.getAccountById(accountResult.insertId)

            return {
                success: true,
                message: "Registration successful",
                data: {
                    user,
                    account,
                },
            }
        } catch (error) {
            await connection.rollback()
            console.error("Error in register:", error)
            throw error
        } finally {
            connection.release()
        }
    }

    // ===== ĐĂNG NHẬP =====
    // static async login(username, password) {
    //     try {
    //         // 1. Tìm account theo username
    //         const [accounts] = await db.query(
    //             `SELECT a.*, u.FirstName, u.LastName, u.Email, u.Avt, u.Gender, u.Address, u.Statuses as UserStatus
    //              FROM Accounts a
    //              INNER JOIN Users u ON a.UserID = u.ID
    //              WHERE a.UserName = ?`,
    //             [username]
    //         )

    //         if (accounts.length === 0) {
    //             throw new Error("Invalid username or password")
    //         }

    //         const account = accounts[0]

    //         // 2. Kiểm tra account status
    //         if (account.Statuses === 0) {
    //             throw new Error("Account is disabled")
    //         }

    //         // 3. Kiểm tra user status
    //         if (account.UserStatus === 0) {
    //             throw new Error("User account is disabled")
    //         }

    //         // 4. Verify password
    //         const isValidPassword = await bcrypt.compare(
    //             password,
    //             account.PasswordHash
    //         )
    //         if (!isValidPassword) {
    //             throw new Error("Invalid username or password")
    //         }

    //         // 5. Lấy thông tin đầy đủ
    //         const user = await this.getUserById(account.UserID)

    //         return {
    //             success: true,
    //             message: "Login successful",
    //             data: {
    //                 user,
    //                 account: {
    //                     id: account.ID,
    //                     userId: account.UserID,
    //                     userName: account.UserName,
    //                     statuses: account.Statuses,
    //                 },
    //             },
    //         }
    //     } catch (error) {
    //         console.error("Error in login:", error)
    //         throw error
    //     }
    // }
    // ===== ĐĂNG NHẬP (deprecated - sử dụng loginUser) =====
    // ===== ĐĂNG NHẬP BẰNG EMAIL =====
    static async loginUser(emailOrUsername, password) {
        try {
            // ✅ FIX: Tìm account theo EMAIL thay vì username
            // Join với bảng Users để lấy email
            const [accounts] = await db.query(
                `SELECT a.*, u.FirstName, u.LastName, u.Email, u.Avt, u.Gender, u.Address, u.Statuses as UserStatus
             FROM Accounts a
             INNER JOIN Users u ON a.UserID = u.ID
             WHERE u.Email = ? OR a.UserName = ?`,
                [emailOrUsername, emailOrUsername]
            )

            if (accounts.length === 0) {
                throw new Error("Invalid email or password")
            }

            const account = accounts[0]

            // 2. Kiểm tra account status
            if (account.Statuses === 0) {
                throw new Error("Account is disabled")
            }

            // 3. Kiểm tra user status
            if (account.UserStatus === 0) {
                throw new Error("User account is disabled")
            }

            // 4. Verify password
            const isValidPassword = await bcrypt.compare(
                password,
                account.PasswordHash
            )
            if (!isValidPassword) {
                throw new Error("Invalid email or password")
            }

            // 5. Lấy thông tin đầy đủ
            const user = await this.getUserById(account.UserID)

            return {
                success: true,
                message: "Login successful",
                data: {
                    user,
                    account: {
                        id: account.ID,
                        userId: account.UserID,
                        userName: account.UserName,
                        statuses: account.Statuses,
                    },
                },
            }
        } catch (error) {
            console.error("Error in loginUser:", error)
            throw error
        }
    }

    static async login(username, password) {
        return this.loginUser(username, password)
    }

    // ===== LOGIN ADMIN =====
    static async loginAdmin(adminName, password) {
        try {
            const [admins] = await db.query(
                `SELECT * FROM Admins WHERE AdminName = ?`,
                [adminName]
            )

            if (admins.length === 0) {
                return null // không tìm thấy admin
            }

            const admin = admins[0]

            // Nếu admin có hash password
            const isValidPassword = await bcrypt.compare(
                password,
                admin.PasswordHash
            )
            if (!isValidPassword) {
                return null
            }

            return {
                ID: admin.ID,
                AdminName: admin.AdminName,
                Roles: admin.Roles,
            }
        } catch (error) {
            console.error("Error in loginAdmin:", error)
            throw error
        }
    }

    // ===== LẤY USER THEO ID =====
    static async getUserById(userId) {
        try {
            const [users] = await db.query(
                `SELECT ID, FirstName, LastName, BirthDate, Gender, PhoneNumber, Email, Avt, Address, Region, Statuses, CreatedTime
                 FROM Users WHERE ID = ?`,
                [userId]
            )

            if (users.length === 0) {
                return null
            }

            const user = users[0]
            return {
                id: user.ID,
                firstName: user.FirstName,
                lastName: user.LastName,
                fullName: `${user.FirstName} ${user.LastName}`.trim(),
                birthDate: user.BirthDate,
                gender: user.Gender,
                phoneNumber: user.PhoneNumber,
                email: user.Email,
                avt: user.Avt,
                address: user.Address,
                region: user.Region,
                statuses: user.Statuses,
                createdTime: user.CreatedTime,
            }
        } catch (error) {
            console.error("Error in getUserById:", error)
            throw error
        }
    }

    // ===== LẤY USER THEO EMAIL =====
    static async getUserByEmail(email) {
        try {
            const [users] = await db.query(
                "SELECT * FROM Users WHERE Email = ?",
                [email]
            )

            if (users.length === 0) {
                return null
            }

            return users[0]
        } catch (error) {
            console.error("Error in getUserByEmail:", error)
            throw error
        }
    }

    // ===== LẤY ACCOUNT THEO ID =====
    static async getAccountById(accountId) {
        try {
            const [accounts] = await db.query(
                "SELECT ID, UserID, UserName, Statuses, CreatedTime FROM Accounts WHERE ID = ?",
                [accountId]
            )

            if (accounts.length === 0) {
                return null
            }

            const account = accounts[0]
            return {
                id: account.ID,
                userId: account.UserID,
                userName: account.UserName,
                statuses: account.Statuses,
                createdTime: account.CreatedTime,
            }
        } catch (error) {
            console.error("Error in getAccountById:", error)
            throw error
        }
    }

    // ===== LẤY ACCOUNT THEO USERNAME =====
    static async getAccountByUsername(username) {
        try {
            const [accounts] = await db.query(
                "SELECT * FROM Accounts WHERE UserName = ?",
                [username]
            )

            if (accounts.length === 0) {
                return null
            }

            return accounts[0]
        } catch (error) {
            console.error("Error in getAccountByUsername:", error)
            throw error
        }
    }

    // ===== LẤY ACCOUNT THEO USER ID =====
    static async getAccountByUserId(userId) {
        try {
            const [accounts] = await db.query(
                "SELECT ID, UserID, UserName, Statuses, CreatedTime FROM Accounts WHERE UserID = ?",
                [userId]
            )

            if (accounts.length === 0) {
                return null
            }

            return accounts[0]
        } catch (error) {
            console.error("Error in getAccountByUserId:", error)
            throw error
        }
    }

    // ===== KIỂM TRA EMAIL TỒN TẠI =====
    static async emailExists(email) {
        try {
            const [rows] = await db.query(
                "SELECT COUNT(*) as count FROM Users WHERE Email = ?",
                [email]
            )
            return rows[0].count > 0
        } catch (error) {
            console.error("Error in emailExists:", error)
            throw error
        }
    }

    // ===== KIỂM TRA USERNAME TỒN TẠI =====
    static async usernameExists(username) {
        try {
            const [rows] = await db.query(
                "SELECT COUNT(*) as count FROM Accounts WHERE UserName = ?",
                [username]
            )
            return rows[0].count > 0
        } catch (error) {
            console.error("Error in usernameExists:", error)
            throw error
        }
    }

    // ===== CẬP NHẬT PROFILE USER =====
    static async updateProfile(userId, updateData) {
        try {
            const updates = []
            const values = []

            // Chỉ update các field được cung cấp
            const allowedFields = {
                FirstName: updateData.FirstName,
                LastName: updateData.LastName,
                BirthDate: updateData.BirthDate,
                Gender: updateData.Gender,
                PhoneNumber: updateData.PhoneNumber,
                Address: updateData.Address,
                Region: updateData.Region,
                Avt: updateData.Avt,
            }

            for (const [field, value] of Object.entries(allowedFields)) {
                if (value !== undefined && value !== null) {
                    updates.push(`${field} = ?`)
                    values.push(value)
                }
            }

            if (updates.length === 0) {
                throw new Error("No fields to update")
            }

            values.push(userId)
            const query = `UPDATE Users SET ${updates.join(", ")} WHERE ID = ?`

            const [result] = await db.query(query, values)

            if (result.affectedRows === 0) {
                throw new Error("User not found")
            }

            return await this.getUserById(userId)
        } catch (error) {
            console.error("Error in updateProfile:", error)
            throw error
        }
    }

    // ===== ĐỔI MẬT KHẨU =====
    static async changePassword(userId, oldPassword, newPassword) {
        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            // 1. Lấy account
            const account = await this.getAccountByUserId(userId)
            if (!account) {
                throw new Error("Account not found")
            }

            // 2. Lấy password hash
            const [accounts] = await connection.query(
                "SELECT PasswordHash FROM Accounts WHERE UserID = ?",
                [userId]
            )

            if (accounts.length === 0) {
                throw new Error("Account not found")
            }

            // 3. Verify old password
            const isValidPassword = await bcrypt.compare(
                oldPassword,
                accounts[0].PasswordHash
            )
            if (!isValidPassword) {
                throw new Error("Current password is incorrect")
            }

            // 4. Validate new password
            if (newPassword.length < 6) {
                throw new Error("New password must be at least 6 characters")
            }

            // 5. Hash new password
            const saltRounds = 10
            const newHashedPassword = await bcrypt.hash(newPassword, saltRounds)

            // 6. Update password
            const [result] = await connection.query(
                "UPDATE Accounts SET PasswordHash = ? WHERE UserID = ?",
                [newHashedPassword, userId]
            )

            await connection.commit()

            return {
                success: true,
                message: "Password changed successfully",
                affectedRows: result.affectedRows,
            }
        } catch (error) {
            await connection.rollback()
            console.error("Error in changePassword:", error)
            throw error
        } finally {
            connection.release()
        }
    }

    // ===== CẬP NHẬT USERNAME =====
    static async updateUsername(userId, newUsername) {
        try {
            // Kiểm tra username mới đã tồn tại chưa
            const exists = await this.usernameExists(newUsername)
            if (exists) {
                throw new Error("Username already exists")
            }

            const [result] = await db.query(
                "UPDATE Accounts SET UserName = ? WHERE UserID = ?",
                [newUsername, userId]
            )

            if (result.affectedRows === 0) {
                throw new Error("Account not found")
            }

            return {
                success: true,
                message: "Username updated successfully",
            }
        } catch (error) {
            console.error("Error in updateUsername:", error)
            throw error
        }
    }

    // ===== CẬP NHẬT STATUS USER =====
    static async updateUserStatus(userId, status) {
        try {
            const [result] = await db.query(
                "UPDATE Users SET Statuses = ? WHERE ID = ?",
                [status, userId]
            )

            return result.affectedRows
        } catch (error) {
            console.error("Error in updateUserStatus:", error)
            throw error
        }
    }

    // ===== CẬP NHẬT STATUS ACCOUNT =====
    static async updateAccountStatus(userId, status) {
        try {
            const [result] = await db.query(
                "UPDATE Accounts SET Statuses = ? WHERE UserID = ?",
                [status, userId]
            )

            return result.affectedRows
        } catch (error) {
            console.error("Error in updateAccountStatus:", error)
            throw error
        }
    }

    // ===== XÓA USER (Soft Delete) =====
    static async softDeleteUser(userId) {
        try {
            await this.updateUserStatus(userId, 0)
            await this.updateAccountStatus(userId, 0)

            return {
                success: true,
                message: "User deactivated successfully",
            }
        } catch (error) {
            console.error("Error in softDeleteUser:", error)
            throw error
        }
    }

    // ===== XÓA USER (Hard Delete) =====
    static async deleteUser(userId) {
        const connection = await db.getConnection()

        try {
            await connection.beginTransaction()

            // Xóa account trước (do foreign key)
            await connection.query("DELETE FROM Accounts WHERE UserID = ?", [
                userId,
            ])

            // Xóa user
            const [result] = await connection.query(
                "DELETE FROM Users WHERE ID = ?",
                [userId]
            )

            await connection.commit()

            return {
                success: true,
                message: "User deleted successfully",
                affectedRows: result.affectedRows,
            }
        } catch (error) {
            await connection.rollback()
            console.error("Error in deleteUser:", error)
            throw error
        } finally {
            connection.release()
        }
    }

    // ===== LẤY TẤT CẢ USERS =====
    static async getAllUsers(options = {}) {
        try {
            const { limit = 100, offset = 0, status = null } = options

            let query = `
                SELECT u.*, a.UserName, a.Statuses as AccountStatus
                FROM Users u
                LEFT JOIN Accounts a ON u.ID = a.UserID
            `
            const params = []

            if (status !== null) {
                query += " WHERE u.Statuses = ?"
                params.push(status)
            }

            query += " ORDER BY u.CreatedTime DESC LIMIT ? OFFSET ?"
            params.push(limit, offset)

            const [rows] = await db.query(query, params)
            return rows
        } catch (error) {
            console.error("Error in getAllUsers:", error)
            throw error
        }
    }

    // ===== TÌM KIẾM USERS =====
    static async searchUsers(keyword, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options

            const [rows] = await db.query(
                `SELECT u.*, a.UserName
                 FROM Users u
                 LEFT JOIN Accounts a ON u.ID = a.UserID
                 WHERE u.FirstName LIKE ? OR u.LastName LIKE ? OR u.Email LIKE ? OR a.UserName LIKE ?
                 ORDER BY u.CreatedTime DESC
                 LIMIT ? OFFSET ?`,
                [
                    `%${keyword}%`,
                    `%${keyword}%`,
                    `%${keyword}%`,
                    `%${keyword}%`,
                    limit,
                    offset,
                ]
            )

            return rows
        } catch (error) {
            console.error("Error in searchUsers:", error)
            throw error
        }
    }

    // ===== ĐẾM TỔNG SỐ USERS =====
    static async countUsers(status = null) {
        try {
            let query = "SELECT COUNT(*) as total FROM Users"
            const params = []

            if (status !== null) {
                query += " WHERE Statuses = ?"
                params.push(status)
            }

            const [rows] = await db.query(query, params)
            return rows[0].total
        } catch (error) {
            console.error("Error in countUsers:", error)
            throw error
        }
    }

    // ===== THỐNG KÊ USERS =====
    static async getUserStats() {
        try {
            const [stats] = await db.query(`
                SELECT 
                    COUNT(*) as TotalUsers,
                    SUM(CASE WHEN Statuses = 1 THEN 1 ELSE 0 END) as ActiveUsers,
                    SUM(CASE WHEN Statuses = 0 THEN 1 ELSE 0 END) as InactiveUsers,
                    SUM(CASE WHEN Gender = 'male' THEN 1 ELSE 0 END) as MaleCount,
                    SUM(CASE WHEN Gender = 'female' THEN 1 ELSE 0 END) as FemaleCount
                FROM Users
            `)

            return stats[0]
        } catch (error) {
            console.error("Error in getUserStats:", error)
            throw error
        }
    }
    // ===== CẬP NHẬT LASTLOGIN =====
    static async updateLastLogin(userId) {
        try {
            await db.query("UPDATE Users SET LastLogin = NOW() WHERE ID = ?", [
                userId,
            ])

            // Ghi log vào UserLogins
            await db.query(
                "INSERT INTO UserLogins (UserID, LoginTime) VALUES (?, NOW())",
                [userId]
            )

            console.log(`✓ Updated LastLogin for user ${userId}`)
            return true
        } catch (error) {
            console.error("Error in updateLastLogin:", error)
            // Không throw error vì đây không phải critical
            return false
        }
    }
} // ← Đóng class

module.exports = AuthSite
