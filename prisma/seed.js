"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcryptjs_1 = __importDefault(require("bcryptjs"));
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminPassword, admin, clientsData, i, c, client, password, staffNames, _i, staffNames_1, staffName, suppliers, _a, suppliers_1, sup;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('🌱 Seeding database...');
                    return [4 /*yield*/, bcryptjs_1.default.hash('admin123', 10)];
                case 1:
                    adminPassword = _b.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: 'admin@riznex.com' },
                            update: {},
                            create: {
                                email: 'admin@riznex.com',
                                password: adminPassword,
                                name: 'Riznex Admin',
                                role: 'admin',
                            },
                        })];
                case 2:
                    admin = _b.sent();
                    console.log('✅ Admin created:', admin.email);
                    clientsData = [
                        { name: 'Hungry Birds', address: '12 High Street, Manchester', phone: '0161 000 0001', email: 'hungrybirdsmcr@gmail.com' },
                        { name: 'Tasty Buns', address: '45 Market Street, Leeds', phone: '0113 000 0002', email: 'tastybuns@gmail.com' },
                        { name: 'Herbies Kitchen', address: '8 Church Road, Birmingham', phone: '0121 000 0003', email: 'herbies@gmail.com' },
                        { name: 'Andromeda Grill', address: '22 Broad Lane, Sheffield', phone: '0114 000 0004', email: 'andromeda@gmail.com' },
                        { name: 'Spice Garden', address: '67 Victoria Ave, Liverpool', phone: '0151 000 0005', email: 'spicegarden@gmail.com' },
                    ];
                    i = 0;
                    _b.label = 3;
                case 3:
                    if (!(i < clientsData.length)) return [3 /*break*/, 16];
                    c = clientsData[i];
                    return [4 /*yield*/, prisma.client.upsert({
                            where: { id: "client-".concat(i + 1) },
                            update: {},
                            create: {
                                id: "client-".concat(i + 1),
                                name: c.name,
                                address: c.address,
                                phone: c.phone,
                                email: c.email,
                            },
                        })];
                case 4:
                    client = _b.sent();
                    return [4 /*yield*/, bcryptjs_1.default.hash("client".concat(i + 1, "pass"), 10)];
                case 5:
                    password = _b.sent();
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { email: c.email },
                            update: {},
                            create: {
                                email: c.email,
                                password: password,
                                name: c.name,
                                role: 'client',
                                clientId: client.id,
                            },
                        })
                        // Create default staff for each client
                    ];
                case 6:
                    _b.sent();
                    staffNames = ['Alex Johnson', 'Maria Garcia', 'James Wilson', 'Sarah Brown', 'Tom Davis', 'Emma Taylor'];
                    _i = 0, staffNames_1 = staffNames;
                    _b.label = 7;
                case 7:
                    if (!(_i < staffNames_1.length)) return [3 /*break*/, 10];
                    staffName = staffNames_1[_i];
                    return [4 /*yield*/, prisma.staff.create({
                            data: {
                                clientId: client.id,
                                name: staffName,
                                role: 'Staff Member',
                                weeklyWage: 350,
                            },
                        })];
                case 8:
                    _b.sent();
                    _b.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 7];
                case 10:
                    suppliers = [
                        { name: 'Express Foods', category: 'food' },
                        { name: 'JJ Foodservice', category: 'food' },
                        { name: 'Bidfood', category: 'food' },
                        { name: 'Packaging Direct', category: 'packaging' },
                    ];
                    _a = 0, suppliers_1 = suppliers;
                    _b.label = 11;
                case 11:
                    if (!(_a < suppliers_1.length)) return [3 /*break*/, 14];
                    sup = suppliers_1[_a];
                    return [4 /*yield*/, prisma.supplier.create({
                            data: { clientId: client.id, name: sup.name, category: sup.category },
                        })];
                case 12:
                    _b.sent();
                    _b.label = 13;
                case 13:
                    _a++;
                    return [3 /*break*/, 11];
                case 14:
                    console.log("\u2705 Client created: ".concat(c.name, " | Login: ").concat(c.email, " / client").concat(i + 1, "pass"));
                    _b.label = 15;
                case 15:
                    i++;
                    return [3 /*break*/, 3];
                case 16:
                    console.log('\n🎉 Seed complete!');
                    console.log('Admin login: admin@riznex.com / admin123');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(console.error)
    .finally(function () { return prisma.$disconnect(); });
